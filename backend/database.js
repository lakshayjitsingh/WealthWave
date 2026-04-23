const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
      )`, () => {
        // Try to add the new budget_limit column. Ignore error if it already exists.
        db.run(`ALTER TABLE users ADD COLUMN budget_limit REAL DEFAULT 2000`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Migration error adding budget_limit:', err.message);
          }
        });
      });

      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT CHECK(type IN ('income', 'expense')),
        amount REAL,
        category TEXT,
        description TEXT,
        date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        target_amount REAL,
        current_amount REAL DEFAULT 0,
        icon TEXT,
        color TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
    });
  }
});

module.exports = db;
