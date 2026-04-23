require('dotenv').config();
const express = require('express');

const cors = require('cors');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const goalsRoutes = require('./routes/goals');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/goals', goalsRoutes);

// Root route for friendly message
app.get('/', (req, res) => {
  res.send('Welcome to the FinFlow API! The server is running successfully. Please open the frontend application (usually http://localhost:5173) in your browser to use the app.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
