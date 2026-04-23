const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// GET all goals for a user
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all('SELECT * FROM goals WHERE user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// POST a new goal
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, target_amount, icon, color } = req.body;

  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Name and target amount are required' });
  }

  db.run(
    'INSERT INTO goals (user_id, name, target_amount, icon, color) VALUES (?, ?, ?, ?, ?)',
    [userId, name, target_amount, icon || '🎯', color || '#8b5cf6'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({ id: this.lastID, name, target_amount, icon, color, current_amount: 0 });
    }
  );
});

// PUT update goal progress (add/remove money)
router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;
  const goalId = req.params.id;

  if (amount === undefined) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  db.run(
    'UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?',
    [amount, goalId, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Goal updated successfully' });
    }
  );
});

// DELETE a goal
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const goalId = req.params.id;

  db.run('DELETE FROM goals WHERE id = ? AND user_id = ?', [goalId, userId], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Goal deleted successfully' });
  });
});

module.exports = router;
