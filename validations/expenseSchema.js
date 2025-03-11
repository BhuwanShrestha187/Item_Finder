const Joi = require('joi');

/**
 * Schema for validating expense object
 */
const expenseSchema = {
    create: Joi.object({
        title: Joi.string().trim().required().min(3).max(100)
            .messages({
                'string.base': 'Title must be a string',
                'string.empty': 'Title is required',
                'string.min': 'Title must be at least {#limit} characters',
                'string.max': 'Title cannot exceed {#limit} characters',
                'any.required': 'Title is required'
            }),
        amount: Joi.number().required().positive()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be greater than 0',
                'any.required': 'Amount is required'
            }),
        date: Joi.date().iso().required()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
                'any.required': 'Date is required'
            }),
        category: Joi.string().required()
            .messages({
                'string.base': 'Category must be a string',
                'string.empty': 'Category is required',
                'any.required': 'Category is required'
            }),
        description: Joi.string().allow('').max(500)
            .messages({
                'string.base': 'Description must be a string',
                'string.max': 'Description cannot exceed {#limit} characters'
            }),
        paymentMethod: Joi.string().allow('').max(50)
            .messages({
                'string.base': 'Payment method must be a string',
                'string.max': 'Payment method cannot exceed {#limit} characters'
            }),
        tags: Joi.array().items(Joi.string()).default([])
            .messages({
                'array.base': 'Tags must be an array',
                'string.base': 'Each tag must be a string'
            })
    }),

    update: Joi.object({
        title: Joi.string().trim().min(3).max(100)
            .messages({
                'string.base': 'Title must be a string',
                'string.min': 'Title must be at least {#limit} characters',
                'string.max': 'Title cannot exceed {#limit} characters'
            }),
        amount: Joi.number().positive()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be greater than 0'
            }),
        date: Joi.date().iso()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.format': 'Date must be in ISO format (YYYY-MM-DD)'
            }),
        category: Joi.string()
            .messages({
                'string.base': 'Category must be a string'
            }),
        description: Joi.string().allow('').max(500)
            .messages({
                'string.base': 'Description must be a string',
                'string.max': 'Description cannot exceed {#limit} characters'
            }),
        paymentMethod: Joi.string().allow('').max(50)
            .messages({
                'string.base': 'Payment method must be a string',
                'string.max': 'Payment method cannot exceed {#limit} characters'
            }),
        tags: Joi.array().items(Joi.string())
            .messages({
                'array.base': 'Tags must be an array',
                'string.base': 'Each tag must be a string'
            })
    }).min(1).messages({
        'object.min': 'At least one field is required for update'
    }),

    getById: Joi.object({
        id: Joi.string().required()
            .messages({
                'string.base': 'ID must be a string',
                'string.empty': 'ID is required',
                'any.required': 'ID is required'
            })
    }),

    delete: Joi.object({
        id: Joi.string().required()
            .messages({
                'string.base': 'ID must be a string',
                'string.empty': 'ID is required',
                'any.required': 'ID is required'
            })
    })
};

module.exports = expenseSchema; 