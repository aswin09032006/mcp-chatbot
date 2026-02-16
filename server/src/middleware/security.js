const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security middleware configuration
 * Includes helmet for security headers and rate limiting
 */

// Helmet configuration for security headers
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs: windowMs || 15 * 60 * 1000, // 15 minutes default
        max: max || 100, // Limit each IP to 100 requests per windowMs
        message: message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
};

// Specific rate limiters for different endpoints
const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 requests
    'Too many authentication attempts, please try again later.'
);

const apiLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests, please try again later.'
);

const chatLimiter = createRateLimiter(
    1 * 60 * 1000, // 1 minute
    20, // 20 messages per minute
    'Too many messages, please slow down.'
);

const uploadLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10, // 10 uploads
    'Too many file uploads, please try again later.'
);

module.exports = {
    helmetConfig,
    authLimiter,
    apiLimiter,
    chatLimiter,
    uploadLimiter,
    createRateLimiter
};
