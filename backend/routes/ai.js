const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// The only job of this file is to bridge your Dashboard to OpenRouter
router.post('/insights', authenticateToken, async (req, res) => {
  try {
    const { summary, transactions, goals, message, estimatedTax, healthScore, currency, rate } = req.body;
    const userName = req.user.name || 'User';

    // 1. Calculate Category Totals to find the biggest "Money Drain"
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

    // 2. Build the knowledge context
    const context = `
      User: ${userName}
      Balance: ${currency} ${(summary.balance * rate).toFixed(2)}
      TOTAL EXPENSES THIS MONTH: ${currency} ${(summary.expense * rate).toFixed(2)}
      TOTAL INCOME THIS MONTH: ${currency} ${(summary.income * rate).toFixed(2)}
      Estimated Annual Tax (Total Year): ${currency} ${Number(estimatedTax).toFixed(0)}
      Financial Health Score: ${healthScore}/900
      TOP SPENDING CATEGORIES (This Month): ${sortedCategories || "No expenses yet"}
    `;

    // 2. The Master Manual (Teaching the AI about your site)
    const systemPrompt = `
      You are the WealthWave AI, a premium financial advisor. 
      You are built into the WealthWave Dashboard.
      
      WEBSITE FEATURE GUIDE (Tell the user to find these):
      - LIGHT/DARK MODE: There is a Sun/Moon icon in the top-right of the Navbar. Clicking it toggles between Light and Dark mode.
      - ADDING DATA: The "Add New Transaction" card is in the center. Users can input Amount, Name, and Category.
      - TAX SYSTEM: The "Estimated Annual Tax" card shows taxes for India, USA, UK, and Germany. Users can change the country by switching the Currency at the top.
      - SAVINGS GOALS: The "Savings Goals" section allows tracking progress for specific items.
      - EXPORTS: The "Download Report" button (top right) allows exporting data as PDF or CSV.
      - CHARTS: The dashboard shows "Cash Flow" bar charts and "Expense Breakdown" pie charts.
      
      USER DATA FOR ANALYSIS:
      ${context}
      
      INSTRUCTIONS:
      1. BREVITY RULE: If the user says "hi", "hello", or just greets you, respond with a SINGLE friendly sentence. 
      2. MATH RULE: The "EXPENSES THIS MONTH" figure is for ONE month. Do NOT divide it by 12 to calculate a monthly average. The monthly average IS the monthly total if no other data exists.
      3. DATA ANALYSIS: When asked about expenses or saving money, look at the "TOP SPENDING CATEGORIES". If a category (like Food) is high, give specific advice on how to cut it down.
      4. KNOWLEDGE RULE: Only explain website features if the user asks "how to", "about the site", or "how does this work".
      5. Be professional and concise.
    `;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wealth-wave-gamma.vercel.app', // Your CORRECT Vercel URL
          'X-Title': 'WealthWave AI',
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ insight: reply });

  } catch (error) {
    console.log("--- OPENROUTER DEBUG INFO ---");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error Message:", error.message);
    }
    console.log("------------------------------");
    
    res.status(500).json({ insight: "OpenRouter is rejecting the request. Check your terminal for the 'DEBUG INFO' to see the exact reason!" });
  }
});


module.exports = router;
