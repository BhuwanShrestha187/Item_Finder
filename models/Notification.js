/*
    Author: Bhuwan Shrestha, Shubh Soni, Dev Patel, Alen varghese
    Description: This is the model for the notification.
    Project Name: Expense Tracker
    date: 2025-April 16
*/

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('budget_alert', 'budget_exceeded', 'monthly_summary', 'yearly_summary', 'budget_created'),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
});

// Define associations
Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications'
});

module.exports = Notification; 