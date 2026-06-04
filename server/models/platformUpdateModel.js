const mongoose = require('mongoose');

const platformUpdateSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startAt: {
      type: Date,
      default: Date.now,
    },
    endAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

platformUpdateSchema.index({ audience: 1, isActive: 1, startAt: -1 });

const PlatformUpdate = mongoose.model('PlatformUpdate', platformUpdateSchema);

module.exports = PlatformUpdate;
