const Joi = require('joi');
const { ApiError } = require('./errorHandler');

/**
 * Middleware to validate request data against a Joi schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            errors: {
                wrap: {
                    label: false
                }
            }
        });

        if (!error) {
            return next();
        }

        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        throw new ApiError(400, 'Validation error', errors);
    };
};

module.exports = validate; 