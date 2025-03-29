const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Notification = require('./Notification');
const { Op } = require('sequelize');

const Budget = sequelize.define('Budget', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: true,
            min: 0
        }
    },
    period: {
        type: DataTypes.ENUM('monthly', 'yearly'),
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isAfterStartDate(value) {
                if (value <= this.startDate) {
                    throw new Error('End date must be after start date');
                }
            }
        }
    },
    alertThreshold: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 80,
        validate: {
            min: 0,
            max: 100
        }
    },
    isAlertEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    remaining: {
        type: DataTypes.VIRTUAL,
        get() {
            const spent = this.getDataValue('spent') || 0;
            return parseFloat(this.amount) - spent;
        }
    },
    spent: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('spent') || 0;
        },
        set(value) {
            this.setDataValue('spent', value);
        }
    },
    percentageUsed: {
        type: DataTypes.VIRTUAL,
        get() {
            const amount = parseFloat(this.amount);
            if (amount === 0) return 0;
            return (this.spent / amount) * 100;
        }
    },
    isAlertTriggered: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.percentageUsed >= this.alertThreshold;
        }
    }
});

// Define associations
Budget.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Budget.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});

User.hasMany(Budget, {
    foreignKey: 'userId',
    as: 'budgets'
});

Category.hasMany(Budget, {
    foreignKey: 'categoryId',
    as: 'budgets'
});

// Enhanced instance methods
Budget.prototype.updateSpent = async function() {
    const Expense = require('./Expense');
    const { Op } = require('sequelize');
    
    const totalSpent = await Expense.sum('amount', {
        where: {
            userId: this.userId,
            categoryId: this.categoryId,
            date: {
                [Op.between]: [this.startDate, this.endDate]
            }
        }
    });
    
    this.spent = totalSpent || 0;
    return this;
};

Budget.prototype.checkAndCreateAlert = async function() {
    if (!this.isAlertEnabled) return null;

    const percentageUsed = this.percentageUsed;
    const alertThreshold = this.alertThreshold;

    if (percentageUsed >= alertThreshold) {
        const category = await this.getCategory();
        const user = await this.getUser();

        const title = percentageUsed >= 100 
            ? 'Budget Exceeded!' 
            : 'Budget Alert: Approaching Limit';

        const message = percentageUsed >= 100
            ? `You have exceeded your ${category.name} budget of ${this.amount}. Total spent: ${this.spent}`
            : `Your ${category.name} budget is at ${percentageUsed.toFixed(2)}% of the limit (${this.amount}). Current spent: ${this.spent}`;

        // Create notification
        await Notification.create({
            userId: this.userId,
            type: percentageUsed >= 100 ? 'budget_exceeded' : 'budget_alert',
            title,
            message,
            metadata: {
                budgetId: this.id,
                categoryId: this.categoryId,
                amount: this.amount,
                spent: this.spent,
                percentageUsed
            }
        });

        return {
            title,
            message,
            percentageUsed,
            isExceeded: percentageUsed >= 100
        };
    }

    return null;
};

// Static method to get yearly budget summary
Budget.getYearlySummary = async function(userId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const budgets = await this.findAll({
        where: {
            userId,
            period: 'yearly',
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate }
        },
        include: [{
            model: Category,
            as: 'category'
        }]
    });

    const monthlyBudgets = await this.findAll({
        where: {
            userId,
            period: 'monthly',
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate }
        },
        include: [{
            model: Category,
            as: 'category'
        }]
    });

    // Update spent amounts
    await Promise.all([
        ...budgets.map(budget => budget.updateSpent()),
        ...monthlyBudgets.map(budget => budget.updateSpent())
    ]);

    const yearlySummary = budgets.map(budget => ({
        category: budget.category.name,
        budgeted: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        percentageUsed: budget.percentageUsed
    }));

    const monthlySummary = {};
    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const monthBudgets = monthlyBudgets.filter(budget => 
            budget.startDate <= monthEnd && budget.endDate >= monthStart
        );

        monthlySummary[month] = monthBudgets.map(budget => ({
            category: budget.category.name,
            budgeted: budget.amount,
            spent: budget.spent,
            remaining: budget.remaining,
            percentageUsed: budget.percentageUsed
        }));
    }

    return {
        yearly: yearlySummary,
        monthly: monthlySummary
    };
};

// Static method to create monthly budgets from yearly budget
Budget.createMonthlyBudgets = async function(yearlyBudget) {
    const monthlyBudgets = [];
    const year = new Date(yearlyBudget.startDate).getFullYear();
    const monthlyAmount = yearlyBudget.amount / 12;

    for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const monthlyBudget = await this.create({
            userId: yearlyBudget.userId,
            categoryId: yearlyBudget.categoryId,
            amount: monthlyAmount,
            period: 'monthly',
            startDate,
            endDate,
            alertThreshold: yearlyBudget.alertThreshold,
            isAlertEnabled: yearlyBudget.isAlertEnabled
        });

        monthlyBudgets.push(monthlyBudget);
    }

    return monthlyBudgets;
};

// Static method to get all budgets with alerts triggered
Budget.getTriggeredAlerts = async function(userId) {
    const budgets = await this.findAll({
        where: {
            userId,
            isAlertEnabled: true
        },
        include: [{
            model: Category,
            as: 'category'
        }]
    });

    // Update spent amounts
    await Promise.all(budgets.map(budget => budget.updateSpent()));

    // Filter budgets where alerts are triggered
    const budgetsWithAlerts = budgets.filter(budget => budget.isAlertTriggered);

    // Create alert objects
    const alerts = [];
    for (const budget of budgetsWithAlerts) {
        const alert = await budget.checkAndCreateAlert();
        if (alert) {
            alerts.push({
                budget,
                ...alert
            });
        }
    }

    return alerts;
};

module.exports = Budget; 