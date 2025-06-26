const rateLimit = require('fastify-rate-limit');

// Configure rate limiting for login attempts - currently disabled
const loginLimiter = {
  global: false,
  max: 1000, // Increased from 50 to 1000 to effectively disable rate limiting
  timeWindow: '1 hour', // Increased window to reduce impact
  errorResponse: {
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many login attempts, please try again later'
  },
  skipOnError: true,
  keyGenerator: (req) => req.ip
};

// Export a dummy middleware function that does nothing instead of the rate limiter
module.exports = (req, reply, next) => {
  next();
};

// Commented out real rate limiter
// module.exports = rateLimit(loginLimiter);
