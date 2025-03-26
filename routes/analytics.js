/*
    Author: Bhuwan Shrestha, Shubh Soni, Dev Patel, Alen varghese
    Description: This is the route for the analytics.
    Project Name: Expense Tracker
    date: 2025-April 16
*/

const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analytics');
const auth = require('../middleware/auth');
// Get expense summary
router.get('/summary', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = await AnalyticsService.getExpenseSummary(
            req.user.id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching expense summary',
            error: error.message
        });
    }
});

// Get monthly trend
router.get('/trend', auth, async (req, res) => {
    try {
        const { months } = req.query;
        const trend = await AnalyticsService.getMonthlyTrend(
            req.user.id,
            parseInt(months) || 12
        );

        res.json({
            success: true,
            data: trend
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching monthly trend',
            error: error.message
        });
    }
});

// Get budget analysis
router.get('/budget-analysis', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const analysis = await AnalyticsService.getBudgetAnalysis(
            req.user.id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching budget analysis',
            error: error.message
        });
    }
});

// Get category patterns
router.get('/category-patterns', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const patterns = await AnalyticsService.getCategoryPatterns(
            req.user.id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: patterns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching category patterns',
            error: error.message
        });
    }
});

// Get recurring expenses
router.get('/recurring', auth, async (req, res) => {
    try {
        const recurringExpenses = await AnalyticsService.getRecurringExpenses(
            req.user.id
        );

        res.json({
            success: true,
            data: recurringExpenses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recurring expenses',
            error: error.message
        });
    }
});

module.exports = router; 