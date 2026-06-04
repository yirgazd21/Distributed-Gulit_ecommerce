const mongoose = require('mongoose');

const supportMessageSchema = mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ['seller', 'admin'],
      required: true,
    },
    senderSeller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
    },
    senderAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportThreadSchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      default: null,
    },
    threadType: {
      type: String,
      enum: ['ticket', 'direct', 'broadcast'],
      default: 'ticket',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    unreadBySeller: {
      type: Boolean,
      default: false,
    },
    unreadByAdmin: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    messages: [supportMessageSchema],
  },
  {
    timestamps: true,
  }
);

supportThreadSchema.index({ seller: 1, lastMessageAt: -1 });
supportThreadSchema.index({ threadType: 1, lastMessageAt: -1 });

const SupportThread = mongoose.model('SupportThread', supportThreadSchema);

module.exports = SupportThread;
