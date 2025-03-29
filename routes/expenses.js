const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/receipts';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
        }
    }
});

// Get all expenses for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await Expense.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Category,
                as: 'category'
            }],
            order: [['date', 'DESC']]
        });

        res.json({
            success: true,
            data: expenses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching expenses',
            error: error.message
        });
    }
});

// Get a single expense by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching expense',
            error: error.message
        });
    }
});

// Get expenses by date range
router.get('/range', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const expenses = await Expense.findAll({
            where: {
                userId: req.user.id,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Category,
                as: 'category'
            }],
            order: [['date', 'DESC']]
        });

        res.json({
            success: true,
            data: expenses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching expenses',
            error: error.message
        });
    }
});

// Create a new expense
router.post('/', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { amount, description, date, categoryId, note, isRecurring, recurringFrequency } = req.body;
        
        // Calculate next recurring date if it's a recurring expense
        let nextRecurringDate = null;
        if (isRecurring === 'true' && recurringFrequency) {
            const currentDate = new Date(date);
            switch (recurringFrequency) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
            }
            nextRecurringDate = currentDate.toISOString().split('T')[0];
        }

        const expense = await Expense.create({
            amount,
            description,
            date,
            categoryId,
            userId: req.user.id,
            receipt: req.file ? req.file.path : null,
            note,
            isRecurring: isRecurring === 'true',
            recurringFrequency: isRecurring === 'true' ? recurringFrequency : null,
            nextRecurringDate
        });

        res.status(201).json({
            success: true,
            data: expense
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating expense',
            error: error.message
        });
    }
});

// Update an expense
router.put('/:id', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { amount, description, date, categoryId, note, isRecurring, recurringFrequency } = req.body;
        const expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        // Calculate next recurring date if it's a recurring expense
        let nextRecurringDate = null;
        if (isRecurring === 'true' && recurringFrequency) {
            const currentDate = new Date(date);
            switch (recurringFrequency) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
            }
            nextRecurringDate = currentDate.toISOString().split('T')[0];
        }

        // Delete old receipt if new one is uploaded
        if (req.file && expense.receipt) {
            fs.unlinkSync(expense.receipt);
        }

        await expense.update({
            amount,
            description,
            date,
            categoryId,
            note,
            receipt: req.file ? req.file.path : expense.receipt,
            isRecurring: isRecurring === 'true',
            recurringFrequency: isRecurring === 'true' ? recurringFrequency : null,
            nextRecurringDate
        });

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating expense',
            error: error.message
        });
    }
});

// Delete an expense
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        // Delete receipt file if exists
        if (expense.receipt) {
            fs.unlinkSync(expense.receipt);
        }

        await expense.destroy();
        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting expense',
            error: error.message
        });
    }
});

// Get expense statistics
router.get('/statistics', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const expenses = await Expense.findAll({
            where: {
                userId: req.user.id,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        // Calculate total expenses
        const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        res.json({
            success: true,
            data: {
                totalExpenses,
                expenses
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching expense statistics',
            error: error.message
        });
    }
});

// Process recurring expenses
router.post('/process-recurring', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const recurringExpenses = await Expense.findAll({
            where: {
                userId: req.user.id,
                isRecurring: true,
                nextRecurringDate: {
                    [Op.lte]: today
                }
            }
        });

        for (const expense of recurringExpenses) {
            // Create new expense
            const newExpense = await Expense.create({
                amount: expense.amount,
                description: expense.description,
                date: expense.nextRecurringDate,
                categoryId: expense.categoryId,
                userId: expense.userId,
                note: expense.note,
                isRecurring: true,
                recurringFrequency: expense.recurringFrequency
            });

            // Calculate next recurring date
            const nextDate = new Date(expense.nextRecurringDate);
            switch (expense.recurringFrequency) {
                case 'daily':
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                case 'weekly':
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
            }

            // Update original expense with next recurring date
            await expense.update({
                nextRecurringDate: nextDate.toISOString().split('T')[0]
            });
        }

        res.json({
            success: true,
            message: 'Recurring expenses processed successfully',
            processedCount: recurringExpenses.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing recurring expenses',
            error: error.message
        });
    }
});

module.exports = router; 