const mongoose = require('mongoose');

const adminSellerActivitySchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['STATUS_UPDATE', 'NOTE'],
    },
    note: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    metadata: {
      previous: {
        isApproved: { type: Boolean },
        isActive: { type: Boolean },
      },
      current: {
        isApproved: { type: Boolean },
        isActive: { type: Boolean },
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
      statusChange: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

adminSellerActivitySchema.index({ seller: 1, createdAt: -1 });

const AdminSellerActivity = mongoose.model('AdminSellerActivity', adminSellerActivitySchema);
module.exports = AdminSellerActivity;
