const rateLimit = require('fastify-rate-limit');

// Configure rate limiting for login attempts
const loginLimiter = {
  global: false,
  max: 50, // Limit each IP to 5 login requests per window
  timeWindow: '10 minutes',
  errorResponse: {
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many login attempts, please try again later'
  },
  skipOnError: true,
  keyGenerator: (req) => req.ip
};

module.exports = rateLimit(loginLimiter);
