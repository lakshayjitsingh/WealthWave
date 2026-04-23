const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/insights', authenticateToken, async (req, res) => {
  try {
    const { summary, transactions, goals, message, estimatedTax, healthScore, currency, rate } = req.body;
    const userName = req.user.name || 'User';

    const categoryTotals = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
      }
    });

    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amt]) => `${cat}: ${currency} ${(amt * rate).toFixed(2)}`)
      .join(', ');

    const context = `
      User: ${userName}
      Balance: ${currency} ${(summary.balance * rate).toFixed(2)}
      TOTAL EXPENSES THIS MONTH: ${currency} ${(summary.expense * rate).toFixed(2)}
      TOTAL INCOME THIS MONTH: ${currency} ${(summary.income * rate).toFixed(2)}
      Estimated Annual Tax: ${currency} ${Number(estimatedTax).toFixed(0)}
      Financial Health Score: ${healthScore}/900
      TOP SPENDING CATEGORIES: ${sortedCategories || "No expenses yet"}
    `;

    const systemPrompt = `
      You are the WealthWave AI advisor. Help the user with their finances.
      User Data: ${context}
      Be professional and concise.
    `;

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ insight: "API Key missing on server." });
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct:free", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ insight: reply });

  } catch (error) {
    console.error("AI Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ insight: "The AI is currently unavailable. Please try again in a few minutes." });
  }
});

module.exports = router;
