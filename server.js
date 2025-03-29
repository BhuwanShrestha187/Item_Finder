const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');

// Import models
const User = require('./models/User');
const Category = require('./models/Category');
const Expense = require('./models/Expense');
const Budget = require('./models/Budget');
const Notification = require('./models/Notification');

// Import routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5001;

// Default categories that will be created for each user
const DEFAULT_CATEGORIES = [
    { name: 'Food & Dining', type: 'expense', description: 'Restaurants, groceries, and food delivery', icon: '🍽️' },
    { name: 'Transportation', type: 'expense', description: 'Public transit, fuel, car maintenance', icon: '🚗' },
    { name: 'Housing', type: 'expense', description: 'Rent, utilities, maintenance', icon: '🏠' },
    { name: 'Entertainment', type: 'expense', description: 'Movies, games, hobbies', icon: '🎮' },
    { name: 'Shopping', type: 'expense', description: 'Clothing, electronics, personal items', icon: '🛍️' },
    { name: 'Healthcare', type: 'expense', description: 'Medical expenses, medications, insurance', icon: '⚕️' },
    { name: 'Education', type: 'expense', description: 'Tuition, books, courses', icon: '📚' },
    { name: 'Bills & Utilities', type: 'expense', description: 'Phone, internet, electricity', icon: '📱' },
    { name: 'Salary', type: 'income', description: 'Regular employment income', icon: '💰' },
    { name: 'Investments', type: 'income', description: 'Stock dividends, interest, capital gains', icon: '📈' },
    { name: 'Freelance', type: 'income', description: 'Contract work and side gigs', icon: '💻' },
    { name: 'Gifts', type: 'income', description: 'Money received as gifts', icon: '🎁' }
];

const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
        
        try {
            await sequelize.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."enum_categories_type" AS ENUM ('expense', 'income');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);
        } catch (error) {
            // Continue if error
        }

        try {
            await sequelize.sync({ force: true });
        } catch (error) {
            throw error;
        }
    } catch (error) {
        throw error;
    }
};

// Function to create default categories for a new user
const createDefaultCategories = async (userId) => {
    try {
        const now = new Date();
        const categories = DEFAULT_CATEGORIES.map(cat => ({
            ...cat,
            userId,
            createdAt: now,
            updatedAt: now
        }));

        await Category.bulkCreate(categories);
    } catch (error) {
        throw error;
    }
};

const startServer = async () => {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {});

        app.locals.createDefaultCategories = createDefaultCategories;
    } catch (error) {
        process.exit(1);
    }
};

startServer();