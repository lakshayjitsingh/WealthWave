import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Sparkles, Download, Edit2, Search, Target, PiggyBank, FileText, X, MessageSquare, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Dashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [summary, setSummary] = useState({ balance: 0, income: 0, expense: 0, predictedExpense: 0 });
  const [transactions, setTransactions] = useState([]);
  
  // New features state
  const [budgetLimit, setBudgetLimit] = useState(2000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Savings Goals State
  const [goals, setGoals] = useState([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', icon: '🎯', color: '#8b5cf6' });
  const [targetAmountInput, setTargetAmountInput] = useState(''); // Localized input
  const [isContributing, setIsContributing] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');
  const [exchangeRates, setExchangeRates] = useState({});

  // AI State
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Chart State
  const [timeFilter, setTimeFilter] = useState('1M');
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Toggle body class to hide logout button when chat is open
  useEffect(() => {
    if (isChatOpen) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
  }, [isChatOpen]);
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Hello! I am your WealthWave AI Assistant. I have analyzed your financial data—ask me anything about your balance, spending, or goals!' }
  ]);
  const chatEndRef = React.useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  const syncOfflineData = async () => {
    if (!token) return;
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      for (const t of queue) {
        await axios.post('http://localhost:5000/api/transactions', t, config);
      }
      localStorage.setItem('offlineQueue', '[]');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to sync offline data', err);
    }
  };

  useEffect(() => {
    // Fetch live exchange rates relative to USD
    const fetchRates = async () => {
      try {
        const res = await axios.get('https://open.er-api.com/v6/latest/USD');
        setExchangeRates(res.data.rates);
      } catch (err) {
        console.error('Error fetching exchange rates', err);
        // Fallback rates if API fails
        setExchangeRates({ USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5 });
      }
    };
    fetchRates();
  }, []);

  const fetchDashboardData = async () => {
    if (!isOnline) {
      // Load from cache if offline
      const cachedSummary = localStorage.getItem('cachedSummary');
      const cachedTransactions = localStorage.getItem('cachedTransactions');
      if (cachedSummary) {
        const parsed = JSON.parse(cachedSummary);
        setSummary(parsed);
        if (parsed.budgetLimit) setBudgetLimit(parsed.budgetLimit);
      }
      if (cachedTransactions) setTransactions(JSON.parse(cachedTransactions));
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const sumRes = await axios.get('http://localhost:5000/api/dashboard/summary', config);
      setSummary(sumRes.data);
      if (sumRes.data.budgetLimit) setBudgetLimit(sumRes.data.budgetLimit);
      localStorage.setItem('cachedSummary', JSON.stringify(sumRes.data));
      
      const transRes = await axios.get('http://localhost:5000/api/transactions', config);
      setTransactions(transRes.data);
      localStorage.setItem('cachedTransactions', JSON.stringify(transRes.data));
      
      fetchGoals();
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:5000/api/goals', config);
      setGoals(res.data);
    } catch (err) {
      console.error('Error fetching goals', err);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    // Convert the typed amount (in current currency) back to base USD for the database
    const rate = exchangeRates[currency] || 1;
    const amountInUSD = parseFloat(amount) / rate;
    
    const finalCategory = category === 'Other' && customCategory.trim() !== '' ? customCategory : category;
    const newTx = { type, amount: amountInUSD, category: finalCategory, description, date: new Date().toISOString() };

    if (!isOnline) {
      // Queue it for later and optimistically update
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      queue.push(newTx);
      localStorage.setItem('offlineQueue', JSON.stringify(queue));

      const optimisticTx = { ...newTx, id: Date.now() }; // fake ID
      setTransactions([optimisticTx, ...transactions]);
      
      // Reset form
      setAmount(''); setCategory(type === 'expense' ? 'Food' : 'Salary'); setDescription(''); setCustomCategory('');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:5000/api/transactions', newTx, config);
      
      // Reset form
      setAmount(''); setCategory(type === 'expense' ? 'Food' : 'Salary'); setDescription(''); setCustomCategory('');
      // Refresh data
      fetchDashboardData();
    } catch (err) {
      console.error('Error adding transaction', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:5000/api/transactions/${id}`, config);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting transaction', err);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // Convert localized input to base USD
      const rate = exchangeRates[currency] || 1;
      const targetInUSD = parseFloat(targetAmountInput) / rate;
      
      await axios.post('http://localhost:5000/api/goals', {
        ...newGoal,
        target_amount: targetInUSD
      }, config);
      
      setIsAddingGoal(false);
      setNewGoal({ name: '', target_amount: '', icon: '🎯', color: '#8b5cf6' });
      setTargetAmountInput('');
      fetchGoals();
    } catch (err) {
      console.error('Error adding goal', err);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // Convert localized input back to base USD
      const rate = exchangeRates[currency] || 1;
      const amountInUSD = parseFloat(contributionAmount) / rate;
      
      // Prevent over-contribution
      const goal = goals.find(g => g.id === activeGoalId);
      if (goal) {
        const remainingUSD = goal.target_amount - goal.current_amount;
        if (amountInUSD > remainingUSD) {
          // If the contribution would exceed the target, just cap it at the target
          const cappedAmount = Math.max(0, remainingUSD);
          if (cappedAmount === 0) {
            alert("This goal is already completed!");
            setIsContributing(false);
            setContributionAmount('');
            return;
          }
          // Optional: Tell the user we're capping it
          if (!window.confirm(`That's more than needed! Do you want to contribute just ${formatCurrency(remainingUSD)} to finish this goal?`)) {
            return;
          }
          
          await axios.put(`http://localhost:5000/api/goals/${activeGoalId}`, { amount: cappedAmount }, config);
          
          // Record transaction
          const contributionTx = {
            type: 'expense',
            amount: cappedAmount,
            category: 'Savings',
            description: `Final contribution to goal: ${goal.name}`,
            date: new Date().toISOString()
          };
          await axios.post('http://localhost:5000/api/transactions', contributionTx, config);
        } else {
          await axios.put(`http://localhost:5000/api/goals/${activeGoalId}`, { amount: amountInUSD }, config);
          
          // Record transaction
          const contributionTx = {
            type: 'expense',
            amount: amountInUSD,
            category: 'Savings',
            description: `Contribution to goal: ${goal.name}`,
            date: new Date().toISOString()
          };
          await axios.post('http://localhost:5000/api/transactions', contributionTx, config);
        }
      }

      setIsContributing(false);
      setContributionAmount('');
      setActiveGoalId(null);
      fetchGoals();
      fetchDashboardData(); 
    } catch (err) {
      console.error('Error contributing to goal', err);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal? Any contributions will be refunded to your balance.')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Get the goal details to know the refund amount
      const goalToRefund = goals.find(g => g.id === id);
      if (goalToRefund && goalToRefund.current_amount > 0) {
        // Record as a negative expense (Refund) so that spending also decreases in the budget bar
        const refundTx = {
          type: 'expense',
          amount: -goalToRefund.current_amount,
          category: 'Savings',
          description: `Refund from deleted goal: ${goalToRefund.name}`,
          date: new Date().toISOString()
        };
        await axios.post('http://localhost:5000/api/transactions', refundTx, config);
      }

      await axios.delete(`http://localhost:5000/api/goals/${id}`, config);
      fetchGoals();
      fetchDashboardData(); // Update balance
    } catch (err) {
      console.error('Error deleting goal', err);
    }
  };

  const handleUpdateBudget = async () => {
    if (!newBudgetLimit || isNaN(newBudgetLimit) || Number(newBudgetLimit) <= 0) return alert('Enter a valid budget limit');
    try {
      // Convert localized input back to base USD for the database
      const rate = exchangeRates[currency] || 1;
      const budgetInUSD = Number(newBudgetLimit) / rate;

      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put('http://localhost:5000/api/dashboard/budget', { budgetLimit: budgetInUSD }, config);
      setBudgetLimit(budgetInUSD);
      setIsEditingBudget(false);
      fetchDashboardData(); // Refresh to update cachedSummary
    } catch (err) {
      console.error('Error updating budget', err);
      alert('Failed to update budget limit.');
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const element = document.getElementById('dashboard-content');
    
    // Temporarily apply a fixed width to ensure the layout is consistent for the PDF
    const originalWidth = element.style.width;
    element.style.width = '1200px'; 

    // Expand the transaction list so all items are captured (no scrollbar in PDF)
    const listContainer = document.getElementById('transactions-list-container');
    const originalMaxHeight = listContainer ? listContainer.style.maxHeight : '';
    const originalOverflow = listContainer ? listContainer.style.overflowY : '';
    
    if (listContainer) {
      listContainer.style.maxHeight = 'none';
      listContainer.style.overflowY = 'visible';
    }
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#f8fafc' : '#0f172a',
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content is longer than A4 height
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`WealthWave_Report_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to generate PDF report.');
    } finally {
      // Restore original width and list styles
      element.style.width = originalWidth;
      if (listContainer) {
        listContainer.style.maxHeight = originalMaxHeight;
        listContainer.style.overflowY = originalOverflow;
      }
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '...';
    const rate = exchangeRates[currency] || (currency === 'USD' ? 1 : null);
    
    // If rates aren't loaded yet and it's not USD, show a placeholder
    if (rate === null) return '...';
    
    const convertedValue = value * rate;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(convertedValue || 0);
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
    localStorage.setItem('currency', e.target.value);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!userMessage.trim() || loadingAi) return;

    const newMessage = { role: 'user', text: userMessage };
    setChatMessages(prev => [...prev, newMessage]);
    setUserMessage('');
    setLoadingAi(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post('http://localhost:5000/api/ai/insights', {
        summary,
        transactions,
        goals,
        message: userMessage,
        estimatedTax, 
        healthScore,  
        currency,
        rate: (exchangeRates && exchangeRates[currency]) || 1
      }, config);
      
      setChatMessages(prev => [...prev, { role: 'ai', text: res.data.insight }]);
    } catch (err) {
      console.error('Error in AI Chat', err);
      const errMsg = err.response?.data?.insight || err.response?.data?.error || err.message;
      setChatMessages(prev => [...prev, { role: 'ai', text: `Connection Error: ${errMsg}. Please check if the backend server is running and you are logged in.` }]);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return alert('No transactions to export.');

    // Create CSV headers
    let csvContent = 'Date,Type,Category,Description,Amount (Base USD),Amount (Converted),Currency\n';

    // Add rows
    transactions.forEach(t => {
      const convertedAmount = t.amount * (exchangeRates[currency] || 1);
      const row = [
        new Date(t.date).toLocaleDateString(),
        t.type,
        `"${t.category}"`,
        `"${t.description || ''}"`,
        t.amount.toFixed(2),
        convertedAmount.toFixed(2),
        currency
      ];
      csvContent += row.join(',') + '\n';
    });

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finflow_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const expenseCategories = [
    { name: 'Food', icon: '🍔' },
    { name: 'Transport', icon: '🚌' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Entertainment', icon: '🎮' },
    { name: 'Bills', icon: '💡' },
    { name: 'Education', icon: '📚' },
    { name: 'Health', icon: '💊' },
    { name: 'Other', icon: '✨' }
  ];

  const incomeCategories = [
    { name: 'Salary', icon: '💼' },
    { name: 'Allowance', icon: '🎁' },
    { name: 'Freelance', icon: '💻' },
    { name: 'Gift', icon: '🎉' },
    { name: 'Other', icon: '✨' }
  ];

  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  // Process data for charts based on time filter
  const filterDate = new Date();
  if (timeFilter === '1D') filterDate.setDate(filterDate.getDate() - 1);
  else if (timeFilter === '1W') filterDate.setDate(filterDate.getDate() - 7);
  else if (timeFilter === '1M') filterDate.setMonth(filterDate.getMonth() - 1);
  else if (timeFilter === '1Y') filterDate.setFullYear(filterDate.getFullYear() - 1);
  else if (timeFilter === '10Y') filterDate.setFullYear(filterDate.getFullYear() - 10);

  const filteredChartTransactions = transactions.filter(t => new Date(t.date) >= filterDate);

  const getBucketKey = (date, filter, referenceDate = new Date()) => {
    if (filter === '1W') return date.toLocaleDateString('en-US', { weekday: 'short' });
    if (filter === '1M') {
      const d1 = new Date(referenceDate).setHours(0,0,0,0);
      const d2 = new Date(date).setHours(0,0,0,0);
      const diffTime = Math.abs(d1 - d2);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) return 'Week 4';
      if (diffDays < 14) return 'Week 3';
      if (diffDays < 21) return 'Week 2';
      return 'Week 1';
    }
    if (filter === '1Y') return date.toLocaleDateString('en-US', { month: 'short' });
    if (filter === '10Y') return date.getFullYear().toString();
    return '';
  };

  const chartDataMap = {};
  const now = new Date();
  const bucketKeys = [];
  
  if (timeFilter === '1W') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getBucketKey(d, '1W', now);
      if (!bucketKeys.includes(key)) bucketKeys.push(key);
    }
  } else if (timeFilter === '1M') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getBucketKey(d, '1M', now);
      if (!bucketKeys.includes(key)) bucketKeys.push(key);
    }
  } else if (timeFilter === '1Y') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = getBucketKey(d, '1Y', now);
      if (!bucketKeys.includes(key)) bucketKeys.push(key);
    }
  } else if (timeFilter === '10Y') {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - i);
      const key = getBucketKey(d, '10Y', now);
      if (!bucketKeys.includes(key)) bucketKeys.push(key);
    }
  }

  bucketKeys.forEach(k => chartDataMap[k] = { name: k });

  const incomeCategoriesSet = new Set();
  const expenseCategoriesSet = new Set();

  filteredChartTransactions.forEach(t => {
    const d = new Date(t.date);
    const key = getBucketKey(d, timeFilter, now);
    if (chartDataMap[key]) {
      const amount = t.amount;
      const catKey = t.type === 'expense' ? `Exp_${t.category}` : `Inc_${t.category}`;
      chartDataMap[key][catKey] = (chartDataMap[key][catKey] || 0) + amount;
      
      if (t.type === 'expense') expenseCategoriesSet.add(t.category);
      else incomeCategoriesSet.add(t.category);
    }
  });

  const chartData = bucketKeys.map(k => chartDataMap[k]);
  const incomeCatsArray = Array.from(incomeCategoriesSet);
  const expenseCatsArray = Array.from(expenseCategoriesSet);

  const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#84cc16'];

  // Budget & Search Logic
  const totalExpenseNum = summary.expense || 0;
  const budgetPercent = budgetLimit > 0 ? Math.min((totalExpenseNum / budgetLimit) * 100, 100) : 0;
  let progressColor = 'var(--success)';
  if (budgetPercent >= 80) progressColor = 'var(--warning)';
  if (budgetPercent >= 100) progressColor = 'var(--danger)';

  const filteredTransactions = transactions.filter(t => 
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- WealthWave Financial Health Score ---
  const calcHealthScore = () => {
    let score = 300; // base
    const income = summary.income || 0;
    const expense = summary.expense || 0;
    const balance = summary.balance || 0;

    // 1. Savings ratio: income vs expense (max +300)
    if (income > 0) {
      const savingsRatio = (income - expense) / income;
      score += Math.min(Math.max(savingsRatio * 300, 0), 300);
    }

    // 2. Positive balance bonus (max +100)
    if (balance > 0) score += Math.min(balance / 1000, 100);

    // 3. Savings goals progress bonus (max +100)
    const completedGoals = goals.filter(g => (g.current_amount / g.target_amount) >= 1).length;
    score += Math.min(completedGoals * 25, 100);

    // 4. Budget discipline: not exceeding budget (max +100)
    if (budgetLimit > 0 && expense <= budgetLimit) score += 100;
    else if (budgetLimit > 0) score -= Math.min((expense - budgetLimit) / budgetLimit * 50, 100);

    return Math.round(Math.min(Math.max(score, 300), 900));
  };

  const healthScore = calcHealthScore();
  const healthScoreColor = healthScore >= 750 ? '#10b981' : healthScore >= 650 ? '#f59e0b' : healthScore >= 550 ? '#f97316' : '#ef4444';
  const healthScoreLabel = healthScore >= 750 ? 'Excellent' : healthScore >= 650 ? 'Good' : healthScore >= 550 ? 'Fair' : 'Poor';

  // --- Tax Estimator (Annual) ---
  // Income in the app is stored in USD base. We convert to local currency for tax calc.
  const annualIncomeLocal = (summary.income || 0) * (exchangeRates[currency] || 1);

  const calcTax = () => {
    const inc = annualIncomeLocal;

    if (currency === 'INR') {
      // India New Tax Regime FY 2025-26
      // Slabs: 0-4L:0%, 4-8L:5%, 8-12L:10%, 12-16L:15%, 16-20L:20%, 20-24L:25%, >24L:30%
      // Section 87A rebate: up to ₹60,000 if income ≤ ₹12,00,000
      const slabs = [
        { limit: 400000, rate: 0 },
        { limit: 800000, rate: 0.05 },
        { limit: 1200000, rate: 0.10 },
        { limit: 1600000, rate: 0.15 },
        { limit: 2000000, rate: 0.20 },
        { limit: 2400000, rate: 0.25 },
        { limit: Infinity, rate: 0.30 },
      ];
      let tax = 0;
      let prev = 0;
      for (const slab of slabs) {
        if (inc <= prev) break;
        const taxable = Math.min(inc, slab.limit) - prev;
        tax += taxable * slab.rate;
        prev = slab.limit;
      }
      // Section 87A: Rebate of up to ₹60,000 if net income ≤ ₹12,00,000
      if (inc <= 1200000) tax = Math.max(0, tax - 60000);
      // Add 4% Health & Education Cess on tax
      tax = tax * 1.04;
      return tax;
    }

    if (currency === 'USD') {
      // USA Federal Tax 2025, Single filer. Standard deduction: $15,750
      const deduction = 15750;
      const taxable = Math.max(0, inc - deduction);
      const slabs = [
        { limit: 11925, rate: 0.10 },
        { limit: 48475, rate: 0.12 },
        { limit: 103350, rate: 0.22 },
        { limit: 197300, rate: 0.24 },
        { limit: 250525, rate: 0.32 },
        { limit: 626350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ];
      let tax = 0;
      let prev = 0;
      for (const slab of slabs) {
        if (taxable <= prev) break;
        const t = Math.min(taxable, slab.limit) - prev;
        tax += t * slab.rate;
        prev = slab.limit;
      }
      return tax;
    }

    if (currency === 'GBP') {
      // UK 2024-25. Personal Allowance: £12,570
      // Personal allowance tapers to 0 for income > £100,000 (loses £1 per £2 over £100k)
      let personalAllowance = 12570;
      if (inc > 100000) personalAllowance = Math.max(0, 12570 - Math.floor((inc - 100000) / 2));
      const taxable = Math.max(0, inc - personalAllowance);
      let tax = 0;
      // Basic rate: up to £37,700 of taxable income = 20%
      const basic = Math.min(taxable, 37700);
      tax += basic * 0.20;
      // Higher rate: £37,701 to £112,570 taxable = 40%
      if (taxable > 37700) {
        const higher = Math.min(taxable - 37700, 74870);
        tax += higher * 0.40;
      }
      // Additional rate: above £112,570 taxable = 45%
      if (taxable > 112570) {
        tax += (taxable - 112570) * 0.45;
      }
      return tax;
    }

    if (currency === 'EUR') {
      // Germany 2024. Grundfreibetrag (tax-free): €11,604
      // 14%-42% progressive up to €66,760, 42% up to €277,825, 45% above
      // Simplified using bracket approximation:
      if (inc <= 11604) return 0;
      const taxable = inc - 11604;
      let tax = 0;
      // Zone 1: €0 – €55,156 above Grundfreibetrag => 14% to 42% linear
      // Approximate with midpoints for each sub-zone
      const zone1 = Math.min(taxable, 55156);
      // Linear from 14% at start to 42% at end of zone1
      const avgRate1 = 0.14 + (zone1 / 55156) * (0.42 - 0.14) / 2;
      tax += zone1 * avgRate1;
      // Zone 2: €55,157 – €266,221 above Grundfreibetrag => flat 42%
      if (taxable > 55156) {
        const zone2 = Math.min(taxable - 55156, 211065);
        tax += zone2 * 0.42;
      }
      // Zone 3: above €266,221 => flat 45%
      if (taxable > 266221) {
        tax += (taxable - 266221) * 0.45;
      }
      // Solidarity surcharge: 5.5% of tax if tax > €18,130 (individual)
      if (tax > 18130) tax += tax * 0.055;
      return tax;
    }

    return 0;
  };

  const estimatedTax = calcTax();
  const effectiveTaxRate = annualIncomeLocal > 0 ? (estimatedTax / annualIncomeLocal) * 100 : 0;
  const taxColor = effectiveTaxRate < 10 ? '#10b981' : effectiveTaxRate < 20 ? '#f59e0b' : effectiveTaxRate < 30 ? '#f97316' : '#ef4444';
  const taxLabel = effectiveTaxRate < 10 ? 'Low' : effectiveTaxRate < 20 ? 'Moderate' : effectiveTaxRate < 30 ? 'High' : 'Very High';
  const countryName = currency === 'INR' ? 'India (New Regime)' : currency === 'USD' ? 'USA (Federal)' : currency === 'GBP' ? 'UK' : 'Germany';
  // estimatedTax is in local currency — convert back to USD base so formatCurrency doesn't double-convert
  const estimatedTaxUSD = estimatedTax / (exchangeRates[currency] || 1);

  return (
    <div className="layout-container" style={{ display: 'flex', position: 'relative', overflowX: 'hidden', minHeight: '100vh' }}>
      <div 
        id="dashboard-content" 
        style={{ 
          flex: 1, 
          padding: '20px', 
          borderRadius: '16px',
          transition: 'margin-right 0.3s ease',
          marginRight: isChatOpen ? '350px' : '0'
        }}
      >
        {!isOnline && (
          <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', textAlign: 'center', borderRadius: '8px', marginBottom: '1rem', fontWeight: '500' }}>
            You are currently offline. Changes will be saved and synced when you reconnect.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Welcome, {user?.name}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={generatePDF} 
              className="btn btn-primary" 
              disabled={isGeneratingPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)' }}
            >
              {isGeneratingPDF ? <Sparkles size={16} className="animate-spin" /> : <FileText size={16} />}
              {isGeneratingPDF ? 'Generating...' : 'Download Report'}
            </button>
            <select 
              className="form-control" 
              style={{ width: 'auto', display: 'inline-block' }}
              value={currency}
              onChange={handleCurrencyChange}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

      {/* Budget Progress Bar */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Monthly Budget Limit
            {!isEditingBudget ? (
              <button onClick={() => { 
                setIsEditingBudget(true); 
                const rate = exchangeRates[currency] || 1;
                setNewBudgetLimit((budgetLimit * rate).toFixed(0)); 
              }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Edit2 size={16} />
              </button>
            ) : null}
          </h3>
          {!isEditingBudget ? (
            <span style={{ fontWeight: 'bold', color: progressColor, fontSize: '1.1rem' }}>
              {formatCurrency(totalExpenseNum)} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>/ {formatCurrency(budgetLimit)}</span>
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="number" 
                value={newBudgetLimit} 
                onChange={(e) => setNewBudgetLimit(e.target.value)}
                style={{ width: '100px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15, 23, 42, 0.8)', color: 'white', outline: 'none' }}
              />
              <button onClick={handleUpdateBudget} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Save</button>
              <button onClick={() => setIsEditingBudget(false)} className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Cancel</button>
            </div>
          )}
        </div>
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${budgetPercent}%`, background: progressColor, transition: 'all 0.5s ease', boxShadow: `0 0 10px ${progressColor}` }}></div>
        </div>
      </div>

      {/* Summary Cards - Row 1: Balance, Income, Expenses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Balance</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{formatCurrency(summary.balance)}</h3>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Income</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{formatCurrency(summary.income)}</h3>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: 'var(--danger)' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Expenses</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{formatCurrency(summary.expense)}</h3>
          </div>
        </div>
      </div>

      {/* Summary Cards - Row 2: Health Score + Predicted Expense (centered) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${healthScoreColor}`, width: '320px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={healthScoreColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${((healthScore - 300) / 600) * 175.9} 175.9`}
                transform="rotate(-90 32 32)"
                style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${healthScoreColor})` }}
              />
              <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="700" fill={healthScoreColor}>{healthScore}</text>
            </svg>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Health Score</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: healthScoreColor }}>{healthScoreLabel}</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>out of 900</p>
          </div>
        </div>

        {/* Tax Estimator Card */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${taxColor}`, width: '320px' }}>
          <div style={{ padding: '1rem', background: `rgba(${taxColor === '#10b981' ? '16,185,129' : taxColor === '#f59e0b' ? '245,158,11' : taxColor === '#f97316' ? '249,115,22' : '239,68,68'},0.2)`, borderRadius: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🧾</span>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Est. Annual Tax</p>
            <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: taxColor }}>{formatCurrency(estimatedTaxUSD)}</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{effectiveTaxRate.toFixed(1)}% effective · {taxLabel} · {countryName}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--accent-primary)', width: '320px' }}>
          <div style={{ padding: '1rem', background: 'rgba(192, 132, 252, 0.2)', borderRadius: '12px', color: 'var(--accent-secondary)' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Predicted Expense (Next Month)</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{formatCurrency(summary.predictedExpense)}</h3>
          </div>
        </div>
      </div>

      {/* Savings Goals Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PiggyBank size={24} color="var(--accent-secondary)" /> Savings Goals
          </h3>
          <button 
            onClick={() => setIsAddingGoal(true)} 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Plus size={16} /> Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>You haven't set any savings goals yet. Start small and watch your dreams grow!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {goals.map(goal => {
              const goalPercent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <div key={goal.id} className="glass-panel" style={{ 
                  borderLeft: `4px solid ${goal.color || 'var(--accent-primary)'}`,
                  background: goalPercent >= 100 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--glass-bg) 100%)' : 'var(--glass-bg)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {goalPercent >= 100 && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      right: '-35px', 
                      background: 'var(--success)', 
                      color: 'white', 
                      padding: '5px 40px', 
                      transform: 'rotate(45deg)', 
                      fontSize: '0.65rem', 
                      fontWeight: '800',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      zIndex: 10,
                      letterSpacing: '1px'
                    }}>
                      DONE
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.5rem' }}>{goalPercent >= 100 ? '🏆' : (goal.icon || '🎯')}</span>
                      <div>
                        <h4 style={{ margin: 0, color: goalPercent >= 100 ? 'var(--success)' : 'var(--text-primary)' }}>{goal.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Target: {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => { setActiveGoalId(goal.id); setIsContributing(true); }}
                        className={`btn ${goalPercent >= 100 ? 'btn-success' : 'btn-primary'}`}
                        disabled={goalPercent >= 100}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: goalPercent >= 100 ? 0.8 : 1 }}
                      >
                        {goalPercent >= 100 ? 'Achieved! 🥳' : 'Contribute'}
                      </button>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        title="Delete goal (Refunds balance)"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {goalPercent >= 100 ? 'You reached your target!' : 'Progress'}
                    </span>
                    <span style={{ fontWeight: '600', color: goalPercent >= 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                      {goalPercent.toFixed(0)}% ({formatCurrency(goal.current_amount)})
                    </span>
                  </div>
                  
                  <div style={{ width: '100%', height: '8px', background: 'var(--glass-dark-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${goalPercent}%`, 
                        background: goalPercent >= 100 ? 'var(--success)' : (goal.color || 'var(--accent-primary)'),
                        boxShadow: `0 0 10px ${goalPercent >= 100 ? 'var(--success)' : (goal.color || 'var(--accent-primary)')}`,
                        transition: 'width 1s ease-out'
                      }} 
                    />
                  </div>
              {goalPercent >= 100 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.8rem', fontStyle: 'italic' }}>
                      Goal achieved! You can keep this as a trophy or delete it to refund the amount to your main balance.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ height: '450px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Cash Flow Breakdown</h3>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass-dark-bg)', padding: '4px', borderRadius: '8px' }}>
            {['1W', '1M', '1Y', '10Y'].map(filter => (
              <button 
                key={filter}
                onClick={() => setTimeFilter(filter)}
                style={{
                  background: timeFilter === filter ? 'var(--accent-primary)' : 'transparent',
                  color: timeFilter === filter ? 'white' : 'var(--text-secondary)',
                  border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        {incomeCatsArray.length > 0 || expenseCatsArray.length > 0 ? (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => formatCurrency(val)} width={80} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-dark-solid)', border: '1px solid var(--accent-primary)', borderRadius: '12px', color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(value) => formatCurrency(value)} 
              />
              <Legend />
              {incomeCatsArray.map((category, index) => (
                <Bar 
                  key={`Inc_${category}`} 
                  dataKey={`Inc_${category}`} 
                  name={`Income: ${category}`}
                  stackId="income" 
                  fill={COLORS[index % COLORS.length]} 
                  maxBarSize={50}
                />
              ))}
              {expenseCatsArray.map((category, index) => (
                <Bar 
                  key={`Exp_${category}`} 
                  dataKey={`Exp_${category}`} 
                  name={`Expense: ${category}`}
                  stackId="expense" 
                  fill={COLORS[(index + 3) % COLORS.length]} 
                  maxBarSize={50}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No transactions found for this time period.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Add Transaction Form */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3>New Transaction</h3>
          <form onSubmit={handleAddTransaction} style={{ marginTop: '1.5rem' }}>
            
            {/* Type Toggle */}
            <div style={{ display: 'flex', background: 'var(--glass-dark-bg)', borderRadius: '24px', padding: '4px', marginBottom: '1.5rem' }}>
              <div 
                onClick={() => { setType('expense'); setCategory('Food'); }}
                style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', background: type === 'expense' ? 'var(--danger)' : 'transparent', color: type === 'expense' ? 'white' : 'var(--text-secondary)' }}
              >
                💸 Expense
              </div>
              <div 
                onClick={() => { setType('income'); setCategory('Salary'); }}
                style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', background: type === 'income' ? 'var(--success)' : 'transparent', color: type === 'income' ? 'white' : 'var(--text-secondary)' }}
              >
                💰 Income
              </div>
            </div>
            
            <div className="form-group">
              <label>AMOUNT</label>
              <input type="number" step="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ fontSize: '1.25rem', padding: '16px' }} required />
            </div>
            
            <div className="form-group">
              <label>CATEGORY</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                {currentCategories.map(cat => (
                  <div 
                    key={cat.name}
                    onClick={() => setCategory(cat.name)}
                    style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                      padding: '12px 8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                      background: category === cat.name ? (type === 'expense' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)') : 'var(--glass-dark-bg)',
                      border: category === cat.name ? `1px solid ${type === 'expense' ? 'var(--danger)' : 'var(--success)'}` : '1px solid transparent'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: category === cat.name ? '600' : '400', textAlign: 'center' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {category === 'Other' && (
               <div className="form-group" style={{ marginTop: '1rem' }}>
                 <label>CUSTOM CATEGORY NAME</label>
                 <input type="text" className="form-control" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter custom category" required />
               </div>
            )}
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>NOTE (optional)</label>
              <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Lunch with friends" />
            </div>
            
            <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', padding: '16px', fontSize: '1.1rem', background: 'var(--success)', color: 'white', fontWeight: 'bold', borderRadius: '24px' }}>
              Save transaction
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Recent Transactions</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '0.4rem 1rem 0.4rem 2rem', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', width: '200px', fontSize: '0.85rem' }}
                />
              </div>
              <button 
                onClick={handleExportCSV} 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)' }}
                title="Export to CSV"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
          <div id="transactions-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {filteredTransactions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No transactions found.</p>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass-dark-bg)', borderRadius: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{t.category}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{t.description} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ 
                      fontWeight: '600', 
                      color: (t.type === 'income' || t.amount < 0) ? 'var(--success)' : 'var(--danger)' 
                    }}>
                      {(t.type === 'income' || t.amount < 0) ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="btn btn-danger" style={{ padding: '8px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    {/* Modals */}
    {isAddingGoal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-dark)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Add New Savings Goal</h3>
            <button onClick={() => setIsAddingGoal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
            <form onSubmit={handleAddGoal}>
              <div className="form-group">
                <label>GOAL NAME</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newGoal.name} 
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g. New Laptop" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>TARGET AMOUNT ({currency})</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={targetAmountInput} 
                  onChange={(e) => setTargetAmountInput(e.target.value)}
                  placeholder="0.00" 
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>ICON</label>
                  <select 
                    className="form-control" 
                    value={newGoal.icon} 
                    onChange={(e) => setNewGoal({ ...newGoal, icon: e.target.value })}
                  >
                    <option value="🎯">🎯 Goal</option>
                    <option value="💻">💻 Tech</option>
                    <option value="🚗">🚗 Car</option>
                    <option value="🏠">🏠 House</option>
                    <option value="✈️">✈️ Travel</option>
                    <option value="🎓">🎓 Study</option>
                    <option value="🎸">🎸 Fun</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>COLOR</label>
                  <input 
                    type="color" 
                    className="form-control" 
                    style={{ padding: '4px', height: '42px' }}
                    value={newGoal.color} 
                    onChange={(e) => setNewGoal({ ...newGoal, color: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Create Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {isContributing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Contribute to Goal</h3>
              <button onClick={() => { setIsContributing(false); setContributionAmount(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleContribute}>
              <div className="form-group">
                <label>AMOUNT TO ADD ({currency})</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={contributionAmount} 
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.00" 
                  required 
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  This amount will be deducted from your total balance.
                </p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Confirm Contribution
              </button>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* AI Chat Sidebar */}
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          right: isChatOpen ? 0 : '-350px',
          width: '350px',
          height: '100vh',
          background: 'var(--bg-dark)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 1000,
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-primary)' }}>
            <Sparkles size={20} color="var(--accent-primary)" /> WealthWave AI
          </h3>
          <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chatMessages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--glass-bg)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'ai' ? '1px solid var(--glass-border)' : 'none',
                fontSize: '0.9rem',
                lineHeight: '1.4',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {msg.text}
            </div>
          ))}
          {loadingAi && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--glass-bg)', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', gap: '0.5rem' }}>
              <div className="dot-pulse"></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI is thinking...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Ask anything..."
            style={{ 
              flex: 1, 
              background: 'var(--glass-dark-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px', 
              padding: '0.75rem', 
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            disabled={loadingAi}
            style={{ 
              background: 'var(--accent-primary)', 
              border: 'none', 
              borderRadius: '8px', 
              width: '45px', 
              height: '45px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          style={{ 
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '30px',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
            cursor: 'pointer',
            zIndex: 999,
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare size={28} />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
