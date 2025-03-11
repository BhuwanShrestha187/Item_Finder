const ApiError = require('../utils/ApiError');

/**
 * Middleware for validating request data using Joi schemas
 * @param {Object} schema - Joi schema
 * @param {String} property - Request property to validate (body, params, query)
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], { abortEarly: false });

        if (!error) {
            return next();
        }

        const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');

        return next(new ApiError(400, errorMessage));
    };
};

module.exports = validate; 