const { check } = require('express-validator');

/**
 * Validation schemas for various API endpoints
 */
const validationSchemas = {
    // Auth validations
    register: [
        check('email', 'Please include a valid email').isEmail().normalizeEmail(),
        check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
        check('firstName', 'First name is required').trim().notEmpty(),
        check('lastName', 'Last name is required').trim().notEmpty()
    ],

    login: [
        check('email', 'Please include a valid email').isEmail().normalizeEmail(),
        check('password', 'Password is required').notEmpty()
    ],

    // Category validations
    createCategory: [
        check('name', 'Name is required').trim().notEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income'])
    ],

    updateCategory: [
        check('name', 'Name is required').trim().notEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income'])
    ],

    // Expense validations
    createExpense: [
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
        check('date', 'Date is required in YYYY-MM-DD format')
            .isDate()
            .toDate(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income']),
        check('categoryId', 'Category ID is required').isInt({ min: 1 })
    ],

    updateExpense: [
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
        check('date', 'Date is required in YYYY-MM-DD format')
            .isDate()
            .toDate(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income']),
        check('categoryId', 'Category ID is required').isInt({ min: 1 })
    ],

    // Budget validations
    createBudget: [
        check('name', 'Name is required').trim().notEmpty(),
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0 }),
        check('period', 'Period must be valid').isIn(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
        check('startDate', 'Start date is required in YYYY-MM-DD format')
            .isDate()
            .toDate(),
        check('endDate', 'End date must be a valid date if provided')
            .optional({ nullable: true })
            .isDate()
            .toDate()
            .custom((endDate, { req }) => {
                if (endDate && new Date(endDate) <= new Date(req.body.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),
        check('isRecurring', 'isRecurring must be a boolean value').optional().isBoolean(),
        check('categoryId', 'Category ID must be a positive integer if provided')
            .optional({ nullable: true })
            .isInt({ min: 1 })
    ],

    updateBudget: [
        check('name', 'Name is required').trim().notEmpty(),
        check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0 }),
        check('period', 'Period must be valid').isIn(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
        check('startDate', 'Start date is required in YYYY-MM-DD format')
            .isDate()
            .toDate(),
        check('endDate', 'End date must be a valid date if provided')
            .optional({ nullable: true })
            .isDate()
            .toDate()
            .custom((endDate, { req }) => {
                if (endDate && new Date(endDate) <= new Date(req.body.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),
        check('isRecurring', 'isRecurring must be a boolean value').optional().isBoolean(),
        check('categoryId', 'Category ID must be a positive integer if provided')
            .optional({ nullable: true })
            .isInt({ min: 1 }),
        check('status', 'Status must be valid if provided')
            .optional()
            .isIn(['active', 'completed', 'cancelled'])
    ],

    updateBudgetStatus: [
        check('status', 'Status must be valid').isIn(['active', 'completed', 'cancelled'])
    ],

    // ID parameter validation (for route params)
    idParam: [
        check('id', 'ID must be a positive integer').isInt({ min: 1 })
    ]
};

module.exports = validationSchemas; 