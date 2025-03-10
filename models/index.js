const User = require('./User');
const Category = require('./Category');
const Expense = require('./Expense');
const Budget = require('./Budget');

// Define associations that would cause circular dependencies if defined in the models

// User to Expenses - One to Many
User.hasMany(Expense, {
    foreignKey: 'userId',
    as: 'expenses'
});

// User to Categories - One to Many
User.hasMany(Category, {
    foreignKey: 'userId',
    as: 'categories'
});

// Category to Expenses - One to Many
Category.hasMany(Expense, {
    foreignKey: 'categoryId',
    as: 'expenses'
});

// User to Budgets - One to Many
User.hasMany(Budget, {
    foreignKey: 'userId',
    as: 'budgets'
});

// Category to Budgets - One to Many
Category.hasMany(Budget, {
    foreignKey: 'categoryId',
    as: 'budgets'
});

module.exports = {
    User,
    Category,
    Expense,
    Budget
}; 