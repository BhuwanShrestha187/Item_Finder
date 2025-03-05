const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');

// Import models
const User = require('./models/User');
const Category = require('./models/Category');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Expense Tracker API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

// Default categories that will be created for each user
const DEFAULT_CATEGORIES = [
    { name: 'Food & Dining', type: 'expense', description: 'Restaurants, groceries, and food delivery', icon: '🍽️' },
    { name: 'Transportation', type: 'expense', description: 'Public transit, fuel, car maintenance', icon: '🚗' },
    { name: 'Housing', type: 'expense', description: 'Rent, utilities, maintenance', icon: '🏠' },
    { name: 'Entertainment', type: 'expense', description: 'Movies, games, hobbies', icon: '🎮' },
    { name: 'Shopping', type: 'expense', description: 'Clothing, electronics, personal items', icon: '🛍️' },
    { name: 'Healthcare', type: 'expense', description: 'Medical expenses, medications, insurance', icon: '⚕️' },
    { name: 'Salary', type: 'income', description: 'Regular employment income', icon: '💰' },
    { name: 'Investments', type: 'income', description: 'Stock dividends, interest, capital gains', icon: '📈' }
];

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
        console.log(`Default categories created for user ${userId}`);
    } catch (error) {
        console.error('Error creating default categories:', error);
    }
};

const initializeDatabase = async () => {
    try {
        // First authenticate database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Create enum type for category type if it doesn't exist
        try {
            await sequelize.query(`
                DO $$ BEGIN
                    CREATE TYPE "enum_categories_type" AS ENUM ('expense', 'income');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);
            console.log('Category enum type created or already exists');
        } catch (error) {
            console.log('Error creating enum type:', error.message);
        }

        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('All models synchronized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

const startServer = async () => {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Export createDefaultCategories so it can be used in auth routes
        app.locals.createDefaultCategories = createDefaultCategories;
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
};

startServer(); 