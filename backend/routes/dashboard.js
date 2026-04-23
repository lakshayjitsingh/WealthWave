const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // First fetch the user's custom budget limit
  db.get(`SELECT budget_limit FROM users WHERE id = ?`, [userId], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Database error fetching user' });
    const budgetLimit = userRow ? userRow.budget_limit : 2000;

    // Then fetch their transaction summary
    db.all(
      `SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ? GROUP BY type`,
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching transactions' });
        
        let income = 0;
        let expense = 0;
        
        rows.forEach(row => {
          if (row.type === 'income') income = row.total;
          if (row.type === 'expense') expense = row.total;
        });
        
        const balance = income - expense;
        const smartPrediction = expense > 0 ? (expense * 1.05).toFixed(2) : 0; // Predict 5% increase

        res.json({ balance, income, expense, predictedExpense: smartPrediction, budgetLimit });
      }
    );
  });
});

// Route to update the user's custom budget limit
router.put('/budget', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { budgetLimit } = req.body;
  
  if (!budgetLimit || isNaN(budgetLimit) || budgetLimit <= 0) {
    return res.status(400).json({ error: 'Valid budget limit is required' });
  }
  
  db.run(`UPDATE users SET budget_limit = ? WHERE id = ?`, [budgetLimit, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error updating budget limit' });
    res.json({ message: 'Budget limit updated successfully', budgetLimit });
  });
});

module.exports = router;
