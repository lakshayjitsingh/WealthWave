const express = require('express');
const pool = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Get all transactions for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a new transaction
router.post('/', authenticateToken, async (req, res) => {
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, type, amount, category, description, date]
    );
    const newId = result.rows[0].id;
    res.status(201).json({ id: newId, type, amount, category, description, date });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
