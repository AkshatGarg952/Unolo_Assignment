const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
console.log('Checking DB at:', dbPath);
const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
db.close();
