const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const initDb = async () => {
  try {
    // Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        budget_limit REAL DEFAULT 2000
      )
    `);

    // Create Transactions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT CHECK(type IN ('income', 'expense')),
        amount REAL,
        category TEXT,
        description TEXT,
        date TEXT
      )
    `);

    // Create Goals Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT,
        target_amount REAL,
        current_amount REAL DEFAULT 0,
        icon TEXT,
        color TEXT
      )
    `);

    console.log('PostgreSQL Cloud Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing PostgreSQL database:', err.message);
  }
};

initDb();

module.exports = pool;
