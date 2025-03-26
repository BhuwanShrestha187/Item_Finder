/*
    Author: Bhuwan Shrestha, Shubh Soni, Dev Patel, Alen varghese
    Description: This is the database configuration file for the Expense Tracker project.
    Project Name: Expense Tracker
    date: 2025-March 28

*/

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            underscored: true,
            freezeTableName: true
        }
    }
);

// Test the connection and create database if it doesn't exist
const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
    } catch (error) {
        process.exit(1);
    }
};

initializeDatabase();

module.exports = sequelize; 