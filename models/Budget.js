const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');

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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    period: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly', 'custom'),
        defaultValue: 'monthly',
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    status: {
        type: DataTypes.ENUM('active', 'completed', 'cancelled'),
        defaultValue: 'active'
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    categoryId: {
        type: DataTypes.INTEGER,
        references: {
            model: Category,
            key: 'id'
        },
        allowNull: true
    }
}, {
    tableName: 'budgets',
    timestamps: true
});

// Set up associations
Budget.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});

Budget.belongsTo(Category, {
    foreignKey: 'categoryId',
    onDelete: 'SET NULL'
});

module.exports = Budget; 