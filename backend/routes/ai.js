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

    const context = `User: ${userName}, Balance: ${currency} ${(summary.balance * rate).toFixed(2)}, Expenses: ${currency} ${(summary.expense * rate).toFixed(2)}, Income: ${currency} ${(summary.income * rate).toFixed(2)}, Health Score: ${healthScore}/900, Top Spending: ${sortedCategories || "None"}`;
    const systemPrompt = `You are WealthWave AI. User Data: ${context}. Be professional and concise.`;

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ insight: "API Key missing on Render server." });
    }

    const modelsToTry = [
      "meta-llama/llama-3.1-8b-instruct:free",
      "deepseek/deepseek-chat:free",
      "google/gemini-2.0-flash-lite-001"
    ];

    let lastError = "";
    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: model, 
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }]
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://wealth-wave-gamma.vercel.app',
              'X-Title': 'WealthWave AI'
            },
            timeout: 10000 // 10 second timeout
          }
        );
        
        return res.json({ insight: response.data.choices[0].message.content });
      } catch (err) {
        lastError = err.response && err.response.data && err.response.data.error 
                    ? err.response.data.error.message 
                    : err.message;
        console.log(`Model ${model} failed: ${lastError}`);
        continue; // Try the next model
      }
    }

    // If all fail
    res.status(500).json({ insight: `AI Error: ${lastError}` });

  } catch (error) {
    res.status(500).json({ insight: "Critical AI Error. Please check logs." });
  }
});

module.exports = router;
