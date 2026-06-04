const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Links to the User model
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        platformFee: { type: Number },
        sellerRevenue: { type: Number },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phoneNumber: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentResult: { // Result from payment gateway (like Chapa/PayPal)
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    paymentMethod: {
      type: String,
      required: true,
    },

    paymentMethodType: {
      type: String,
      enum: ['chapa', 'card', 'wallet'],
      default: 'chapa',
    },

    tx_ref: {
      type: String,
      unique: true,
    },

    chapaTransactionId: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },

    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'preparing', 'out_for_delivery', 'delivered'],
      default: 'pending',
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    disputeStatus: {
      type: String,
      enum: ['none', 'open', 'in_review', 'resolved', 'rejected'],
      default: 'none',
    },
    disputeNote: {
      type: String,
      default: '',
    },
    disputeUpdatedAt: {
      type: Date,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'completed', 'rejected'],
      default: 'none',
    },
    refundCriteria: {
      type: String,
      enum: ['damaged_item', 'wrong_product', 'missing_items', 'product_not_working', 'quality_issue', 'delay_above_5_days', 'other'],
    },
    refundReason: {
      type: String,
      default: '',
    },
    refundRequestedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
