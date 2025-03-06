const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { Op } = require('sequelize');

// @route   GET api/expenses
// @desc    Get all expenses for the current user with optional filtering
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            categoryId,
            type,
            minAmount,
            maxAmount,
            sortBy = 'date',
            sortOrder = 'DESC',
            limit = 50,
            offset = 0
        } = req.query;

        // Build where clause
        const whereClause = { userId: req.user.id };

        // Date filter
        if (startDate && endDate) {
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereClause.date = {
                [Op.gte]: startDate
            };
        } else if (endDate) {
            whereClause.date = {
                [Op.lte]: endDate
            };
        }

        // Category filter
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        // Type filter (expense or income)
        if (type && ['expense', 'income'].includes(type)) {
            whereClause.type = type;
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            whereClause.amount = {};
            if (minAmount) whereClause.amount[Op.gte] = minAmount;
            if (maxAmount) whereClause.amount[Op.lte] = maxAmount;
        }

        // Sort options
        const order = [[sortBy, sortOrder]];

        const expenses = await Expense.findAndCountAll({
            where: whereClause,
            order,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        res.json({
            count: expenses.count,
            expenses: expenses.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/expenses/:id
// @desc    Get expense by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        if (!expense) {
            return res.status(404).json({ msg: 'Expense not found' });
        }

        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/expenses
// @desc    Create a new expense
// @access  Private
router.post('/', [
    auth,
    [
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
        check('date', 'Date is required').not().isEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income']),
        check('categoryId', 'Category is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, date, type, categoryId } = req.body;

    try {
        // Verify the category exists and belongs to the user
        const category = await Category.findOne({
            where: {
                id: categoryId,
                userId: req.user.id
            }
        });

        if (!category) {
            return res.status(404).json({ msg: 'Category not found or unauthorized' });
        }

        // Create expense
        const newExpense = await Expense.create({
            amount,
            description,
            date,
            type,
            categoryId,
            userId: req.user.id
        });

        // Get the created expense with category information
        const expense = await Expense.findByPk(newExpense.id, {
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        res.status(201).json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', [
    auth,
    [
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
        check('date', 'Date is required').not().isEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income']),
        check('categoryId', 'Category is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, date, type, categoryId } = req.body;

    try {
        // Find the expense
        let expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        // Check if expense exists
        if (!expense) {
            return res.status(404).json({ msg: 'Expense not found' });
        }

        // Verify the category exists and belongs to the user
        const category = await Category.findOne({
            where: {
                id: categoryId,
                userId: req.user.id
            }
        });

        if (!category) {
            return res.status(404).json({ msg: 'Category not found or unauthorized' });
        }

        // Update expense
        expense.amount = amount;
        expense.description = description;
        expense.date = date;
        expense.type = type;
        expense.categoryId = categoryId;

        await expense.save();

        // Get the updated expense with category information
        const updatedExpense = await Expense.findByPk(expense.id, {
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        res.json(updatedExpense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        // Find the expense
        const expense = await Expense.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        // Check if expense exists
        if (!expense) {
            return res.status(404).json({ msg: 'Expense not found' });
        }

        // Delete expense
        await expense.destroy();

        res.json({ msg: 'Expense removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 