const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const sequelize = require('../config/database');

// @route   GET api/budgets
// @desc    Get all budgets for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, period, categoryId } = req.query;

        // Build where clause
        const whereClause = { userId: req.user.id };

        // Status filter
        if (status && ['active', 'completed', 'cancelled'].includes(status)) {
            whereClause.status = status;
        }

        // Period filter
        if (period && ['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(period)) {
            whereClause.period = period;
        }

        // Category filter
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        const budgets = await Budget.findAll({
            where: whereClause,
            order: [['startDate', 'DESC']],
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        // Enhance budgets with spending information
        const enhancedBudgets = await Promise.all(
            budgets.map(async (budget) => {
                const budgetObj = budget.toJSON();

                // Calculate current spending for the budget period
                const spendingWhereClause = {
                    userId: req.user.id,
                    type: 'expense',
                    date: {
                        [Op.between]: [
                            budgetObj.startDate,
                            budgetObj.endDate || new Date()
                        ]
                    }
                };

                // If budget is tied to a specific category
                if (budgetObj.categoryId) {
                    spendingWhereClause.categoryId = budgetObj.categoryId;
                }

                const spending = await Expense.sum('amount', {
                    where: spendingWhereClause
                }) || 0;

                // Calculate progress and status
                const progress = (spending / budgetObj.amount) * 100;
                let statusInfo = 'on-track';

                if (progress >= 100) {
                    statusInfo = 'exceeded';
                } else if (progress >= 75) {
                    statusInfo = 'warning';
                }

                return {
                    ...budgetObj,
                    spent: spending,
                    remaining: Math.max(0, budgetObj.amount - spending),
                    progress: Math.min(100, progress),
                    statusInfo
                };
            })
        );

        res.json(enhancedBudgets);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/budgets/:id
// @desc    Get budget by ID with spending details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const budget = await Budget.findOne({
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

        if (!budget) {
            return res.status(404).json({ msg: 'Budget not found' });
        }

        const budgetObj = budget.toJSON();

        // Calculate current spending for the budget period
        const spendingWhereClause = {
            userId: req.user.id,
            type: 'expense',
            date: {
                [Op.between]: [
                    budgetObj.startDate,
                    budgetObj.endDate || new Date()
                ]
            }
        };

        // If budget is tied to a specific category
        if (budgetObj.categoryId) {
            spendingWhereClause.categoryId = budgetObj.categoryId;
        }

        // Get spending details
        const spending = await Expense.sum('amount', {
            where: spendingWhereClause
        }) || 0;

        // Calculate daily spending breakdown (last 7 days)
        const currentDate = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(currentDate.getDate() - 7);

        const dailySpending = await Expense.findAll({
            attributes: [
                [sequelize.fn('date', sequelize.col('date')), 'day'],
                [sequelize.fn('sum', sequelize.col('amount')), 'total']
            ],
            where: {
                ...spendingWhereClause,
                date: {
                    [Op.between]: [sevenDaysAgo, currentDate]
                }
            },
            group: [sequelize.fn('date', sequelize.col('date'))],
            order: [[sequelize.fn('date', sequelize.col('date')), 'ASC']],
            raw: true
        });

        // Calculate progress and status
        const progress = (spending / budgetObj.amount) * 100;
        let statusInfo = 'on-track';

        if (progress >= 100) {
            statusInfo = 'exceeded';
        } else if (progress >= 75) {
            statusInfo = 'warning';
        }

        res.json({
            ...budgetObj,
            spent: spending,
            remaining: Math.max(0, budgetObj.amount - spending),
            progress: Math.min(100, progress),
            statusInfo,
            dailySpending
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/budgets
// @desc    Create a new budget
// @access  Private
router.post('/', [
    auth,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0 }),
        check('period', 'Period must be valid').isIn(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
        check('startDate', 'Start date is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name,
        amount,
        period,
        startDate,
        endDate,
        isRecurring = true,
        categoryId
    } = req.body;

    try {
        // If categoryId is provided, verify it belongs to the user
        if (categoryId) {
            const category = await Category.findOne({
                where: {
                    id: categoryId,
                    userId: req.user.id
                }
            });

            if (!category) {
                return res.status(404).json({ msg: 'Category not found or unauthorized' });
            }
        }

        // Create budget
        const budget = await Budget.create({
            name,
            amount,
            period,
            startDate,
            endDate: period === 'custom' ? endDate : null,
            isRecurring,
            categoryId,
            userId: req.user.id
        });

        // Get the created budget with category information
        const createdBudget = await Budget.findByPk(budget.id, {
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        res.status(201).json(createdBudget);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/budgets/:id
// @desc    Update a budget
// @access  Private
router.put('/:id', [
    auth,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0 }),
        check('period', 'Period must be valid').isIn(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
        check('startDate', 'Start date is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name,
        amount,
        period,
        startDate,
        endDate,
        isRecurring,
        categoryId,
        status
    } = req.body;

    try {
        // Find the budget
        let budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        // Check if budget exists
        if (!budget) {
            return res.status(404).json({ msg: 'Budget not found' });
        }

        // If categoryId is provided, verify it belongs to the user
        if (categoryId) {
            const category = await Category.findOne({
                where: {
                    id: categoryId,
                    userId: req.user.id
                }
            });

            if (!category) {
                return res.status(404).json({ msg: 'Category not found or unauthorized' });
            }
        }

        // Update budget
        budget.name = name;
        budget.amount = amount;
        budget.period = period;
        budget.startDate = startDate;
        budget.endDate = period === 'custom' ? endDate : null;
        if (isRecurring !== undefined) budget.isRecurring = isRecurring;
        budget.categoryId = categoryId || null;
        if (status && ['active', 'completed', 'cancelled'].includes(status)) {
            budget.status = status;
        }

        await budget.save();

        // Get the updated budget with category information
        const updatedBudget = await Budget.findByPk(budget.id, {
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name', 'type', 'icon']
                }
            ]
        });

        res.json(updatedBudget);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        // Find the budget
        const budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        // Check if budget exists
        if (!budget) {
            return res.status(404).json({ msg: 'Budget not found' });
        }

        // Delete budget
        await budget.destroy();

        res.json({ msg: 'Budget removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/budgets/:id/status
// @desc    Update budget status (active, completed, cancelled)
// @access  Private
router.put('/:id/status', [
    auth,
    [
        check('status', 'Status must be valid').isIn(['active', 'completed', 'cancelled']),
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    try {
        // Find the budget
        let budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        // Check if budget exists
        if (!budget) {
            return res.status(404).json({ msg: 'Budget not found' });
        }

        // Update budget status
        budget.status = status;
        await budget.save();

        res.json({ id: budget.id, status });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 