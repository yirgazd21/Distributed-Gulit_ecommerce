const RateLimit = require('../models/rateLimitModel');

/**
 * Custom rate limiter middleware using MongoDB.
 * Keeps track of attempts per IP + endpoint to support distributed setups.
 * 
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Cooldown window in milliseconds (default: 1 hour)
 * @param {number} options.max Maximum allowed attempts (default: 5)
 * @param {string} options.message Error message returned when limit is exceeded
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 60 * 1000; // Default: 1 hour
  const max = options.max || 5; // Default: 5 attempts
  const message = options.message || 'Too many attempts. Please try again in {remaining}.';

  return async (req, res, next) => {
    try {
      // Resolve client IP address supporting reverse proxies (Render, Replit, Vercel, etc.)
      const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
      
      // Clean up IP if it contains multiple proxy layers
      const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;

      // Unique identifier for this IP and route
      const key = `rl:${clientIp}:${req.baseUrl}${req.path}`;
      const now = new Date();

      let record = await RateLimit.findOne({ key });

      if (!record) {
        // Try atomic upsert to avoid duplicate key errors during high concurrency
        try {
          record = await RateLimit.findOneAndUpdate(
            { key },
            {
              $setOnInsert: { resetTime: new Date(now.getTime() + windowMs) },
              $inc: { count: 1 }
            },
            { upsert: true, returnDocument: 'after' }
          );
        } catch (upsertError) {
          // If upsert fails due to duplicate key race condition, retrieve the record
          record = await RateLimit.findOne({ key });
        }
      } else {
        if (now > record.resetTime) {
          // Cooldown period has expired: reset count and start new window.
          // We use optimistic locking on the old resetTime to handle concurrent resets safely.
          const updated = await RateLimit.findOneAndUpdate(
            { key, resetTime: record.resetTime },
            { $set: { count: 1, resetTime: new Date(now.getTime() + windowMs) } },
            { returnDocument: 'after' }
          );
          if (updated) {
            record = updated;
          } else {
            // Another request reset it first, retrieve and increment
            record = await RateLimit.findOneAndUpdate(
              { key },
              { $inc: { count: 1 } },
              { returnDocument: 'after' }
            );
          }
        } else {
          // Increment attempts atomically
          record = await RateLimit.findOneAndUpdate(
            { key },
            { $inc: { count: 1 } },
            { returnDocument: 'after' }
          );
        }
      }

      if (record && record.count > max) {
        const remainingMs = record.resetTime - now;
        let remainingText;
        if (remainingMs > 60000) {
          remainingText = `${Math.ceil(remainingMs / 60000)} minutes`;
        } else if (remainingMs > 0) {
          remainingText = `${Math.ceil(remainingMs / 1000)} seconds`;
        } else {
          remainingText = 'a few seconds';
        }

        return res.status(429).json({
          message: message.replace('{remaining}', remainingText)
        });
      }

      next();
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail-open: allow request to proceed if there is a DB error to prevent lockout
      next();
    }
  };
};

module.exports = rateLimiter;
