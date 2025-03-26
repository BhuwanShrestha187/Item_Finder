/*
    Author: Bhuwan Shrestha, Shubh Soni, Dev Patel, Alen varghese
    Description: This is the model for the category.
    Project Name: Expense Tracker
    date: 2025-April 16
*/

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('expense', 'income'),
        allowNull: false,
        defaultValue: 'expense'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'categories'
});

// Define associations
Category.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});

User.hasMany(Category, {
    foreignKey: 'userId'
});

module.exports = Category; 