const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Set up test database path BEFORE requiring the app or db config
const TEST_DB = path.join(__dirname, 'test_checkin_full.sqlite');
process.env.DB_PATH = TEST_DB;

const { db } = require('../config/database');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, role: 'employee' };
        next();
    },
    requireManager: (req, res, next) => next()
}));

const app = require('../server');

describe('Check-in API Validation', () => {

    beforeAll(() => {
        try {
            // Initialize DB schema
            db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    email TEXT,
                    password TEXT,
                    role TEXT,
                    manager_id INTEGER
                );
                CREATE TABLE IF NOT EXISTS checkins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER,
                    client_id INTEGER,
                    checkin_time DATETIME,
                    checkout_time DATETIME,
                    status TEXT,
                    notes TEXT,
                    latitude REAL,
                    longitude REAL,
                    distance_from_client REAL
                );
                CREATE TABLE IF NOT EXISTS clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    address TEXT,
                    lat REAL,
                    lng REAL
                );
                CREATE TABLE IF NOT EXISTS employee_clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER,
                    client_id INTEGER
                );
            `);
        } catch (e) {
            console.error('Schema creation failed:', e);
        }
    });

    afterAll(() => {
        if (db && db.open) db.close();
        try {
            if (fs.existsSync(TEST_DB)) {
                // fs.unlinkSync(TEST_DB); 
            }
        } catch (e) { }
    });

    beforeEach(() => {
        try {
            // Reset data
            db.exec('DELETE FROM checkins');
            db.exec('DELETE FROM users');
            db.exec('DELETE FROM clients');
            db.exec('DELETE FROM employee_clients');

            // Seed basic data
            db.prepare("INSERT INTO users (id, name, role) VALUES (1, 'Test Employee', 'employee')").run();
            // Client location: Delhi
            db.prepare("INSERT INTO clients (id, name, lat, lng) VALUES (1, 'Test Client', 28.5, 77.0)").run();
            db.prepare("INSERT INTO employee_clients (employee_id, client_id) VALUES (1, 1)").run();
        } catch (e) {
            console.error('Seeding failed:', e);
        }
    });

    test('POST /api/checkin should fail if location is missing', async () => {
        const res = await request(app)
            .post('/api/checkin')
            .send({
                client_id: 1,
                notes: 'No location'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Location .* required/);
    });

    test('POST /api/checkin should succeed with location', async () => {
        const res = await request(app)
            .post('/api/checkin')
            .send({
                client_id: 1,
                latitude: 28.5001,
                longitude: 77.0001
            });

        if (res.statusCode !== 201) {
            console.error('Checkin failed body:', res.body);
        }
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
    });

    test('GET /api/checkin/history should fail with invalid date format', async () => {
        const res = await request(app)
            .get('/api/checkin/history?start_date=27-01-2024'); // Wrong format

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/Invalid start_date/);
    });

    test('GET /api/checkin/history should succeed with valid dates', async () => {
        const res = await request(app)
            .get('/api/checkin/history?start_date=2024-01-01');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
