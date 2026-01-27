const request = require('supertest');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Set up test database path BEFORE requiring the app or db config
const TEST_DB = path.join(__dirname, 'test.sqlite');
process.env.DB_PATH = TEST_DB;

// Mock auth middleware
// We need to allow changing the user for different tests
let mockUser = { id: 1, role: 'manager' };

jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = mockUser;
        next();
    },
    requireManager: (req, res, next) => {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        next();
    }
}));

const app = require('../server');
const { db } = require('../config/database');

describe('Daily Summary Report API', () => {

    beforeAll(() => {
        // Initialize DB schema
        // We use the shared db connection via database.js
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'employee',
                manager_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
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
                latitude REAL,
                longitude REAL
            );
        `);
    });

    afterAll(() => {
        // Close the connection
        if (db && db.open) {
            db.close();
        }
        // Attempt to clean up file, ignore if busy (OS might hold lock for a bit)
        try {
            if (fs.existsSync(TEST_DB)) {
                // fs.unlinkSync(TEST_DB); // Skipping unlink to avoid EBUSY on windows
            }
        } catch (e) { console.log('Cleanup error:', e.message); }
    });

    beforeEach(() => {
        // Reset mock user
        mockUser = { id: 1, role: 'manager' };

        // Clear data
        try {
            db.exec('DELETE FROM checkins');
            db.exec('DELETE FROM users');
            db.exec('DELETE FROM clients');
        } catch (e) {
            console.error('Clear data error', e);
        }

        // Seed basic data
        // Manager
        db.prepare("INSERT INTO users (id, name, email, password, role) VALUES (1, 'Manager', 'mgr@test.com', 'pass', 'manager')").run();
        // Employee 1
        db.prepare("INSERT INTO users (id, name, email, password, role, manager_id) VALUES (2, 'Emp1', 'e1@test.com', 'pass', 'employee', 1)").run();
        // Employee 2
        db.prepare("INSERT INTO users (id, name, email, password, role, manager_id) VALUES (3, 'Emp2', 'e2@test.com', 'pass', 'employee', 1)").run();
        // Client 1
        db.prepare("INSERT INTO clients (id, name) VALUES (1, 'Client A')").run();
        // Client 2
        db.prepare("INSERT INTO clients (id, name) VALUES (2, 'Client B')").run();
    });

    test('should return 400 if date is missing', async () => {
        const res = await request(app).get('/api/reports/daily-summary');
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('should return 400 if date format is invalid', async () => {
        const res = await request(app).get('/api/reports/daily-summary?date=24-01-2024');
        expect(res.statusCode).toBe(400);
    });

    test('should return empty stats if no checkins found', async () => {
        const res = await request(app).get('/api/reports/daily-summary?date=2024-01-27');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.team_summary.total_checkins).toBe(0);
        expect(res.body.data.employee_breakdown).toHaveLength(2); // Emp1 and Emp2
    });

    test('should correctly aggregate stats for a date', async () => {
        // Report Date: 2024-01-27 (IST)
        // 04:30 UTC is 10:00 IST (Same day)
        db.prepare(`
            INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, status)
            VALUES 
            (2, 1, '2024-01-27 04:30:00', '2024-01-27 06:30:00', 'checked_out'), -- 2 hours
            (2, 2, '2024-01-27 07:00:00', '2024-01-27 08:00:00', 'checked_out'), -- 1 hour
            (3, 1, '2024-01-27 05:00:00', '2024-01-27 06:00:00', 'checked_out')  -- 1 hour
        `).run();

        const res = await request(app).get('/api/reports/daily-summary?date=2024-01-27');

        expect(res.statusCode).toBe(200);
        const data = res.body.data;

        expect(data.team_summary.total_checkins).toBe(3);
        expect(data.team_summary.total_hours).toBe(4); // 2 + 1 + 1
        expect(data.team_summary.total_unique_clients).toBe(2); // Client A and Client B

        const emp1 = data.employee_breakdown.find(e => e.employee_id === 2);
        expect(emp1.total_hours).toBe(3);
        expect(emp1.total_checkins).toBe(2);
        expect(emp1.clients_visited_count).toBe(2);

        const emp2 = data.employee_breakdown.find(e => e.employee_id === 3);
        expect(emp2.total_hours).toBe(1);
    });

    test('should filter by employee_id', async () => {
        db.prepare(`
            INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, status)
            VALUES 
            (2, 1, '2024-01-27 04:30:00', '2024-01-27 05:30:00', 'checked_out'),
            (3, 1, '2024-01-27 04:30:00', '2024-01-27 05:30:00', 'checked_out')
        `).run();

        const res = await request(app).get('/api/reports/daily-summary?date=2024-01-27&employee_id=2');

        expect(res.statusCode).toBe(200);
        expect(res.body.data.employee_breakdown).toHaveLength(1);
        expect(res.body.data.employee_breakdown[0].employee_id).toBe(2);
        expect(res.body.data.team_summary.total_checkins).toBe(1);
    });

    test('should deny access to non-managers', async () => {
        mockUser = { id: 2, role: 'employee' };
        const res = await request(app).get('/api/reports/daily-summary?date=2024-01-27');
        expect(res.statusCode).toBe(403);
    });
});
