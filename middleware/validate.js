const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Middleware to process express-validator validation results
 * @param {Array|Object} validations - Express validator middlewares
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
    return [
        // Apply all validation middlewares
        ...(Array.isArray(validations) ? validations : [validations]),

        // Check for validation errors
        (req, res, next) => {
            const errors = validationResult(req);

            if (errors.isEmpty()) {
                return next();
            }

            const extractedErrors = errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }));

            throw new ApiError(400, 'Validation error', extractedErrors);
        }
    ];
};

module.exports = validate; 