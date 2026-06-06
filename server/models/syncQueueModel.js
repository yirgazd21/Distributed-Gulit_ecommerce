const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true },
    action: { type: String, required: true },
    query: { type: mongoose.Schema.Types.Mixed, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    options: { type: mongoose.Schema.Types.Mixed },
    origin: { type: String, enum: ['primary', 'secondary', 'unknown'], default: 'unknown' },
    status: { type: String, enum: ['pending', 'processing'], default: 'pending', index: true },
    lockedBy: { type: String },
    lockedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

const { createProxiedModel } = require('../config/connectionManager');
const SyncQueue = createProxiedModel('SyncQueue', syncQueueSchema, 'sync_queue');
SyncQueue.schema = syncQueueSchema;
module.exports = SyncQueue;
