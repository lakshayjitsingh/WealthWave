const express = require('express');
const pool = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// GET all goals for a user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query('SELECT * FROM goals WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch goals error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST a new goal
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, target_amount, icon, color } = req.body;

  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Name and target amount are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO goals (user_id, name, target_amount, icon, color) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, name, target_amount, icon || '🎯', color || '#8b5cf6']
    );
    const newId = result.rows[0].id;
    res.status(201).json({ id: newId, name, target_amount, icon, color, current_amount: 0 });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update goal progress (add/remove money)
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;
  const goalId = req.params.id;

  if (amount === undefined) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  try {
    await pool.query(
      'UPDATE goals SET current_amount = current_amount + $1 WHERE id = $2 AND user_id = $3',
      [amount, goalId, userId]
    );
    res.json({ message: 'Goal updated successfully' });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE a goal
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const goalId = req.params.id;

  try {
    await pool.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
