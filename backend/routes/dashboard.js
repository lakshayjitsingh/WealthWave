const express = require('express');
const pool = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // First fetch the user's custom budget limit
    const userResult = await pool.query(`SELECT budget_limit FROM users WHERE id = $1`, [userId]);
    const budgetLimit = userResult.rows[0] ? userResult.rows[0].budget_limit : 2000;

    // Then fetch their transaction summary
    const transResult = await pool.query(
      `SELECT type, SUM(amount) as total FROM transactions WHERE user_id = $1 GROUP BY type`,
      [userId]
    );
    
    let income = 0;
    let expense = 0;
    
    transResult.rows.forEach(row => {
      if (row.type === 'income') income = parseFloat(row.total);
      if (row.type === 'expense') expense = parseFloat(row.total);
    });
    
    const balance = income - expense;
    const smartPrediction = expense > 0 ? (expense * 1.05).toFixed(2) : 0;

    res.json({ balance, income, expense, predictedExpense: smartPrediction, budgetLimit });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Database error fetching dashboard data' });
  }
});

router.put('/budget', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { budgetLimit } = req.body;
  
  if (!budgetLimit || isNaN(budgetLimit) || budgetLimit <= 0) {
    return res.status(400).json({ error: 'Valid budget limit is required' });
  }
  
  try {
    await pool.query(`UPDATE users SET budget_limit = $1 WHERE id = $2`, [budgetLimit, userId]);
    res.json({ message: 'Budget limit updated successfully', budgetLimit });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ error: 'Database error updating budget limit' });
  }
});

module.exports = router;
