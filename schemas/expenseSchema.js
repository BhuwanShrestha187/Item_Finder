const Joi = require('joi');

/**
 * Joi schema for expense validation
 */
const expenseSchema = {
    create: Joi.object({
        title: Joi.string().trim().required().min(3).max(100),
        amount: Joi.number().required().positive(),
        date: Joi.date().iso().required(),
        category: Joi.string().required(),
        description: Joi.string().allow('').max(500).optional(),
        paymentMethod: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional()
    }),

    update: Joi.object({
        title: Joi.string().trim().min(3).max(100).optional(),
        amount: Joi.number().positive().optional(),
        date: Joi.date().iso().optional(),
        category: Joi.string().optional(),
        description: Joi.string().allow('').max(500).optional(),
        paymentMethod: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional()
    }).min(1)
};

module.exports = expenseSchema; 