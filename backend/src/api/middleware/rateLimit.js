const rateLimit = require('express-rate-limit');

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down' },
});

module.exports = { apiRateLimit };