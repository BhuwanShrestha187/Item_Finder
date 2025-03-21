const Expense = require('../models/Expense');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class AnalyticsService {
    // Get expense summary for a date range
    static async getExpenseSummary(userId, startDate, endDate) {
        const expenses = await Expense.findAll({
            where: {
                userId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const expensesByCategory = expenses.reduce((acc, expense) => {
            const categoryName = expense.category.name;
            acc[categoryName] = (acc[categoryName] || 0) + parseFloat(expense.amount);
            return acc;
        }, {});

        return {
            totalExpenses,
            expensesByCategory,
            totalTransactions: expenses.length
        };
    }

    // Get monthly trend analysis
    static async getMonthlyTrend(userId, months = 12) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const expenses = await Expense.findAll({
            where: {
                userId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'ASC']]
        });

        return expenses.map(expense => ({
            month: expense.getDataValue('month'),
            total: parseFloat(expense.getDataValue('total'))
        }));
    }

    // Get budget vs actual analysis
    static async getBudgetAnalysis(userId, startDate, endDate) {
        const budgets = await Budget.findAll({
            where: {
                userId,
                startDate: {
                    [Op.lte]: endDate
                },
                endDate: {
                    [Op.gte]: startDate
                }
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        const analysis = await Promise.all(budgets.map(async (budget) => {
            const expenses = await Expense.findAll({
                where: {
                    userId,
                    categoryId: budget.categoryId,
                    date: {
                        [Op.between]: [budget.startDate, budget.endDate]
                    }
                }
            });

            const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const remainingAmount = parseFloat(budget.amount) - totalSpent;
            const percentageUsed = (totalSpent / parseFloat(budget.amount)) * 100;

            return {
                category: budget.category.name,
                budgetedAmount: parseFloat(budget.amount),
                actualSpent: totalSpent,
                remainingAmount,
                percentageUsed
            };
        }));

        return analysis;
    }

    // Get category-wise spending patterns
    static async getCategoryPatterns(userId, startDate, endDate) {
        const expenses = await Expense.findAll({
            where: {
                userId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        const patterns = expenses.reduce((acc, expense) => {
            const categoryName = expense.category.name;
            if (!acc[categoryName]) {
                acc[categoryName] = {
                    total: 0,
                    count: 0,
                    average: 0
                };
            }
            acc[categoryName].total += parseFloat(expense.amount);
            acc[categoryName].count += 1;
            acc[categoryName].average = acc[categoryName].total / acc[categoryName].count;
            return acc;
        }, {});

        return patterns;
    }

    // Get recurring expenses analysis
    static async getRecurringExpenses(userId) {
        const recurringExpenses = await Expense.findAll({
            where: {
                userId,
                isRecurring: true
            },
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        return recurringExpenses.map(expense => ({
            id: expense.id,
            amount: parseFloat(expense.amount),
            description: expense.description,
            category: expense.category.name,
            frequency: expense.recurringFrequency,
            nextDueDate: this.calculateNextDueDate(expense.date, expense.recurringFrequency)
        }));
    }

    // Helper method to calculate next due date for recurring expenses
    static calculateNextDueDate(lastDate, frequency) {
        const date = new Date(lastDate);
        switch (frequency.toLowerCase()) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                return null;
        }
        return date;
    }
}

module.exports = AnalyticsService; 