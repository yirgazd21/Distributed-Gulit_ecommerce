const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    resetTime: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index to automatically purge expired documents from MongoDB after resetTime has passed
rateLimitSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

const { createProxiedModel } = require('../config/connectionManager');
const RateLimit = createProxiedModel('RateLimit', rateLimitSchema, 'rate_limits');
RateLimit.schema = rateLimitSchema;

module.exports = RateLimit;
