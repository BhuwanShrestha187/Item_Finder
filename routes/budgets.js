const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// Get all budgets for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const budgets = await Budget.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Category,
                as: 'category'
            }],
            order: [['startDate', 'DESC']]
        });

        // Update spent amounts for each budget
        await Promise.all(budgets.map(budget => budget.updateSpent()));

        res.json({
            success: true,
            data: budgets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching budgets',
            error: error.message
        });
    }
});

// Create a new budget
router.post('/', auth, async (req, res) => {
    try {
        const { amount, period, startDate, endDate, categoryId, alertThreshold, isAlertEnabled } = req.body;

        // Verify category belongs to user
        const category = await Category.findOne({
            where: {
                id: categoryId,
                userId: req.user.id
            }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Validate dates for yearly budget
        if (period === 'yearly') {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (start.getFullYear() !== end.getFullYear()) {
                return res.status(400).json({
                    success: false,
                    message: 'Yearly budget must start and end in the same year'
                });
            }

            // Set start date to January 1st and end date to December 31st of the year
            start.setMonth(0, 1);
            end.setMonth(11, 31);
        }

        const budget = await Budget.create({
            amount,
            period,
            startDate,
            endDate,
            categoryId,
            userId: req.user.id,
            alertThreshold: alertThreshold || 80,
            isAlertEnabled: isAlertEnabled !== undefined ? isAlertEnabled : true
        });

        // If it's a yearly budget, create monthly budgets
        if (period === 'yearly') {
            await Budget.createMonthlyBudgets(budget);
        }

        // Update spent amount and check for alerts
        await budget.updateSpent();
        const alert = await budget.checkAndCreateAlert();

        // Create initial notification for budget creation
        await Notification.create({
            userId: req.user.id,
            type: 'budget_created',
            title: `New ${period} Budget Created`,
            message: `A new ${period} budget of ${amount} has been created for ${category.name}`,
            metadata: {
                budgetId: budget.id,
                categoryId: category.id,
                amount: amount,
                period: period
            }
        });

        res.status(201).json({
            success: true,
            data: {
                budget,
                alert: alert || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating budget',
            error: error.message
        });
    }
});

// Update a budget
router.put('/:id', auth, async (req, res) => {
    try {
        const { amount, period, startDate, endDate, categoryId } = req.body;

        const budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        // If category is being updated, verify it belongs to user
        if (categoryId && categoryId !== budget.categoryId) {
            const category = await Category.findOne({
                where: {
                    id: categoryId,
                    userId: req.user.id
                }
            });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
        }

        await budget.update({
            amount,
            period,
            startDate,
            endDate,
            categoryId
        });

        await budget.updateSpent();

        res.json({
            success: true,
            data: budget
        });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating budget',
            error: error.message
        });
    }
});

// Delete a budget
router.delete('/:id', auth, async (req, res) => {
    try {
        const budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        await budget.destroy();

        res.json({
            success: true,
            message: 'Budget deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting budget',
            error: error.message
        });
    }
});

// Get budget progress
router.get('/:id/progress', auth, async (req, res) => {
    try {
        const budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        await budget.updateSpent();

        res.json({
            success: true,
            data: {
                budget,
                totalSpent: budget.spent,
                remainingAmount: budget.remaining,
                percentageUsed: budget.percentageUsed
            }
        });
    } catch (error) {
        console.error('Error fetching budget progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching budget progress',
            error: error.message
        });
    }
});

// Get budget vs actual comparison
router.get('/comparison', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const comparison = await Budget.getBudgetVsActual(req.user.id, startDate, endDate);

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error getting budget comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting budget comparison',
            error: error.message
        });
    }
});

// Get budget alerts
router.get('/alerts', auth, async (req, res) => {
    try {
        const alerts = await Budget.getTriggeredAlerts(req.user.id);
        
        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting budget alerts',
            error: error.message
        });
    }
});

// Update budget alert settings
router.put('/:id/alert-settings', auth, async (req, res) => {
    try {
        const { alertThreshold, isAlertEnabled } = req.body;

        const budget = await Budget.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        await budget.update({
            alertThreshold,
            isAlertEnabled
        });

        await budget.updateSpent();

        res.json({
            success: true,
            data: budget
        });
    } catch (error) {
        console.error('Error updating budget alert settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating budget alert settings',
            error: error.message
        });
    }
});

// Get category-wise budget caps
router.get('/category-caps', auth, async (req, res) => {
    try {
        const budgets = await Budget.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Category,
                as: 'category'
            }],
            order: [['categoryId', 'ASC']]
        });

        // Update spent amounts for each budget
        await Promise.all(budgets.map(budget => budget.updateSpent()));

        const categoryCaps = budgets.map(budget => ({
            category: budget.category.name,
            cap: budget.amount,
            spent: budget.spent,
            remaining: budget.remaining,
            percentageUsed: budget.percentageUsed,
            isAlertTriggered: budget.isAlertTriggered
        }));

        res.json({
            success: true,
            data: categoryCaps
        });
    } catch (error) {
        console.error('Error getting category caps:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting category caps',
            error: error.message
        });
    }
});

// Get yearly budget summary
router.get('/yearly-summary', auth, async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = year || new Date().getFullYear();

        const summary = await Budget.getYearlySummary(req.user.id, currentYear);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error getting yearly summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting yearly summary',
            error: error.message
        });
    }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: {
                userId: req.user.id,
                type: {
                    [Op.in]: ['budget_alert', 'budget_exceeded']
                }
            },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting notifications',
            error: error.message
        });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await notification.update({ isRead: true });

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
});

// Check and create alerts for all budgets
router.post('/check-alerts', auth, async (req, res) => {
    try {
        const budgets = await Budget.findAll({
            where: {
                userId: req.user.id,
                isAlertEnabled: true
            }
        });

        const alerts = [];
        for (const budget of budgets) {
            await budget.updateSpent();
            const alert = await budget.checkAndCreateAlert();
            if (alert) {
                alerts.push(alert);
            }
        }

        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error('Error checking alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking alerts',
            error: error.message
        });
    }
});

module.exports = router; 