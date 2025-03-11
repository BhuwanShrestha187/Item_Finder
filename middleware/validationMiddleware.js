const { ApiError } = require('./errorHandler');

/**
 * Creates a validation middleware using the provided schema
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const dataToValidate = req[property];

        if (!schema) {
            return next();
        }

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false,
            stripUnknown: true,
            errors: {
                wrap: {
                    label: false
                }
            }
        });

        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');

            return next(new ApiError(400, errorMessage));
        }

        // Replace the validated object
        req[property] = value;
        return next();
    };
};

module.exports = validate; 