const Joi = require('joi');

/**
 * Input validation middleware using Joi
 * Validates request bodies to prevent injection attacks and ensure data integrity
 */

// Validation schemas
const schemas = {
    chat: Joi.object({
        message: Joi.string().required().max(10000),
        chatId: Joi.string().optional().allow(null),
        model: Joi.string().optional(),
        attachments: Joi.array().items(Joi.object({
            filename: Joi.string(),
            type: Joi.string(),
            text: Joi.string()
        })).optional()
    }),

    createEvent: Joi.object({
        summary: Joi.string().required().max(500),
        description: Joi.string().optional().max(2000),
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        attendees: Joi.array().items(Joi.string().email()).optional()
    }),

    sendEmail: Joi.object({
        to: Joi.string().email().required(),
        subject: Joi.string().required().max(500),
        body: Joi.string().required().max(50000)
    }),

    createDocument: Joi.object({
        title: Joi.string().required().max(500)
    }),

    searchQuery: Joi.object({
        query: Joi.string().required().max(500)
    })
};

/**
 * Middleware factory to validate request body against a schema
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} Express middleware function
 */
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];

        if (!schema) {
            console.error(`Validation schema '${schemaName}' not found`);
            return next();
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace req.body with validated and sanitized value
        req.body = value;
        next();
    };
};

/**
 * Sanitize string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

module.exports = {
    validate,
    schemas,
    sanitizeString
};
