const mongoose = require('mongoose');

const sellerWalletTransactionSchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Seller',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Order',
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    type: {
      type: String,
      required: true,
      enum: ['CREDIT', 'DEBIT'],
      default: 'CREDIT',
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

sellerWalletTransactionSchema.index({ seller: 1, order: 1, type: 1 }, { unique: true });

const SellerWalletTransaction = mongoose.model('SellerWalletTransaction', sellerWalletTransactionSchema);

module.exports = SellerWalletTransaction;
