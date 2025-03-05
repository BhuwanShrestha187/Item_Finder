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
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('expense', 'income'),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'categories',
    timestamps: true
});

// Set up association - Each Category belongs to a User
Category.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
});

module.exports = Category; 