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
    
    const systemPrompt = `
      You are WealthWave AI, a premium financial advisor. 
      You are built into the WealthWave Dashboard.
      
      WEBSITE FEATURE GUIDE (Tell the user how to find these):
      - DARK MODE: There is a Sun/Moon icon in the top-right of the Navbar. Clicking it toggles between Light and Dark mode.
      - ADDING DATA: Use the "Add New Transaction" card in the center to input Amount, Name, and Category.
      - TAX SYSTEM: The "Estimated Annual Tax" card shows taxes for India, USA, UK, and Germany. Switch the Currency at the top to change the country.
      - SAVINGS GOALS: Use the "Savings Goals" section to set and track specific financial targets.
      - EXPORTS: Click the "Download Report" button (top right) to export your data as PDF or CSV.
      
      USER DATA FOR ANALYSIS:
      ${context}
      
      INSTRUCTIONS:
      1. If the user asks "how to" or "where is", use the FEATURE GUIDE.
      2. If the user asks about money, use the USER DATA.
      3. Be professional, friendly, and concise.
    `;

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
