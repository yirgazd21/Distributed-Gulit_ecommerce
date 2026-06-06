const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true },
    action: { type: String, required: true },
    query: { type: mongoose.Schema.Types.Mixed, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    options: { type: mongoose.Schema.Types.Mixed },
    origin: { type: String, enum: ['primary', 'secondary', 'unknown'], default: 'unknown' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

const { createProxiedModel } = require('../config/connectionManager');
const SyncQueue = createProxiedModel('SyncQueue', syncQueueSchema, 'sync_queue');
SyncQueue.schema = syncQueueSchema;
module.exports = SyncQueue;
