const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');

const Expense = sequelize.define('Expense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receipt: {
        type: DataTypes.STRING,
        allowNull: true
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    recurringFrequency: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
        allowNull: true
    },
    nextRecurringDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    timestamps: true
});

// Define associations
Expense.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Expense.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});

User.hasMany(Expense, {
    foreignKey: 'userId',
    as: 'expenses'
});

Category.hasMany(Expense, {
    foreignKey: 'categoryId',
    as: 'expenses'
});

module.exports = Expense; 