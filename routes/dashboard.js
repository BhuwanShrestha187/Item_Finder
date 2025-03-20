const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// Get dashboard data
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get total expenses
        const totalExpenses = await Expense.sum('amount', {
            where: { userId }
        }) || 0;

        // Get monthly expenses
        const monthlyExpenses = await Expense.sum('amount', {
            where: {
                userId,
                date: {
                    [Op.between]: [firstDayOfMonth, lastDayOfMonth]
                }
            }
        }) || 0;

        // Get monthly budget
        const monthlyBudget = await Budget.findOne({
            where: {
                userId,
                startDate: {
                    [Op.lte]: firstDayOfMonth
                },
                endDate: {
                    [Op.gte]: lastDayOfMonth
                }
            }
        });

        // Get recent expenses for the chart
        const recentExpenses = await Expense.findAll({
            where: {
                userId,
                date: {
                    [Op.gte]: new Date(now.setDate(now.getDate() - 30))
                }
            },
            order: [['date', 'ASC']],
            limit: 30
        });

        res.json({
            success: true,
            data: {
                totalExpenses,
                monthlyExpenses,
                monthlyBudget: monthlyBudget?.amount || 0,
                recentExpenses
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
});

module.exports = router; 