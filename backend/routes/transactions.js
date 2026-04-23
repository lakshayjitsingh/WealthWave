const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Get all transactions for the logged-in user
router.get('/', authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Add a new transaction
router.post('/', authenticateToken, (req, res) => {
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    `INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, type, amount, category, description, date],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({ id: this.lastID, type, amount, category, description, date });
    }
  );
});

// Delete a transaction
router.delete('/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run(
    `DELETE FROM transactions WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Transaction not found or unauthorized' });
      res.json({ message: 'Transaction deleted' });
    }
  );
});

module.exports = router;
