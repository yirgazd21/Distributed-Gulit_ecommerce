const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Seller = require('../models/sellerModel');
const SellerWalletTransaction = require('../models/sellerWalletTransactionModel');
const axios = require('axios');

// Helper: reserve stock for an order (called only for COD orders)
const reserveOrderStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found: ${item.name}`);
    }
    if (product.countInStock < item.qty) {
      throw new Error(`Not enough stock for ${product.name}. Available: ${product.countInStock}`);
    }
    product.countInStock -= item.qty;
    await product.save();
  }
};

// Helper: release reserved stock (if needed, e.g., when a pending order is cancelled)
// (optional – can be used later)
const releaseOrderStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.countInStock += item.qty;
      await product.save();
    }
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyer)
const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Calculate commission and map items
  const calculatedItems = orderItems.map((item) => ({
    name: item.name,
    qty: item.qty,
    image: item.image,
    price: item.price,
    product: item._id,
    seller: item.user || item.seller,
    platformFee: (item.price * item.qty) * 0.10,
    sellerRevenue: (item.price * item.qty) * 0.90
  }));

  // For Cash on Delivery, reduce stock immediately.
  // For Chapa, stock will be reduced only after payment verification.
  if (paymentMethod !== 'Chapa') {
    await reserveOrderStock(calculatedItems);
  }

  const order = new Order({
    user: req.user._id,
    orderItems: calculatedItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  });

  const createdOrder = await order.save();

  // Notify all connected clients that a new order was placed
  if (req.io) req.io.emit('peer-order-placed', { operationType: 'insert' });

  res.status(201).json(createdOrder);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Authorization: only the order owner or an admin may view this order
  const orderUserId = order.user && order.user._id ? order.user._id.toString() : String(order.user);
  if (orderUserId !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to view this order' });
  }

  res.json(order);
};

// @desc    Get logged-in user's paid orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id, isPaid: true });
  res.json(orders);
};

// @desc    Update order to paid (for manual/cash payments)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (order.isPaid) {
    return res.json(order);
  }

  // For cash payments, stock is already reserved at order creation.
  // For safety, ensure it's not double‑reserved.
  order.isPaid = true;
  order.paymentStatus = 'success';
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.email_address || req.user.email,
  };

  // Seller revenue distribution (same logic as in verifyChapaPayment)
  const sellerRevenueMap = new Map();
  for (const item of order.orderItems) {
    if (!item.seller) continue;
    const sellerId = item.seller.toString();
    const current = sellerRevenueMap.get(sellerId) || 0;
    sellerRevenueMap.set(sellerId, current + Number(item.sellerRevenue || 0));
  }

  for (const [sellerId, amount] of sellerRevenueMap.entries()) {
    if (amount <= 0) continue;
    const existingTx = await SellerWalletTransaction.findOne({
      seller: sellerId,
      order: order._id,
      type: 'CREDIT',
    });
    if (!existingTx) {
      await Seller.findByIdAndUpdate(sellerId, { $inc: { walletBalance: amount } });
      await SellerWalletTransaction.create({
        seller: sellerId,
        order: order._id,
        amount,
        type: 'CREDIT',
        note: `Order payment settled: ${order._id}`,
      });
    }
  }

  const updatedOrder = await order.save();
  // Notify all connected clients that an order was paid
  if (req.io) req.io.emit('peer-order-placed', { operationType: 'update' });
  res.json(updatedOrder);
};

// @desc    Buyer confirms order delivery
// @route   PUT /api/orders/:id/deliver
// @access  Private
const updateOrderToDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (!order.isPaid) {
    res.status(400);
    throw new Error('Order must be paid first');
  }
  if (order.isDelivered) {
    return res.json(order);
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  const updatedOrder = await order.save();
  // Notify all connected clients that an order was delivered
  if (req.io) req.io.emit('peer-order-placed', { operationType: 'update' });
  res.json(updatedOrder);
};

// @desc    Request refund for a paid order
// @route   PUT /api/orders/:id/refund
// @access  Private
const requestOrderRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!order.isPaid) {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }
    // Do not blanket-reject delivered orders here — allow certain criteria for delivered orders
    if (order.refundStatus === 'completed') {
      return res.json(order);
    }

    // Accept structured `criteria`/`details`, but fall back to legacy `reason` payloads.
    let { criteria, details } = req.body;
    const allowed = ['damaged_item', 'wrong_product', 'missing_items', 'product_not_working', 'quality_issue', 'delay_above_5_days', 'other'];
    if (!criteria && req.body.reason) {
      // legacy client sent a free-text reason — treat as 'other' with details
      details = req.body.reason;
      criteria = 'other';
    }
    if (!criteria || !allowed.includes(criteria)) {
      return res.status(400).json({ message: 'Invalid refund criteria' });
    }

    // Criteria-specific checks
    const now = new Date();
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
    // wrong_product: buyer can request before OR after delivery, within 3 days of payment
    if (criteria === 'wrong_product') {
      const paidAt = order.paidAt ? new Date(order.paidAt) : null;
      if (!paidAt) {
        return res.status(400).json({ message: 'Payment date not available to validate wrong product request' });
      }
      const daysSincePayment = Math.floor((now - paidAt) / (1000 * 60 * 60 * 24));
      if (daysSincePayment > 3) {
        return res.status(400).json({ message: 'Wrong product requests must be made within 3 days of payment' });
      }
    }

    // For reasons that require the product to have arrived, ensure order was delivered and is within allowed window
    if (['damaged_item', 'missing_items', 'product_not_working', 'quality_issue'].includes(criteria)) {
      if (!order.isDelivered || !deliveredAt) {
        return res.status(400).json({ message: 'This refund reason requires the order to be delivered first' });
      }
      const daysSinceDelivery = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24));
      // damaged/missing/not working/quality_issue — allow within 7 days of delivery
      if (daysSinceDelivery > 7) {
        return res.status(400).json({ message: 'This refund reason must be requested within 7 days of delivery' });
      }
    }

    // Delay-based refunds apply when order is not delivered and enough time has passed
    if (criteria === 'delay_above_5_days') {
      if (order.isDelivered) {
        return res.status(400).json({ message: 'Delay-based refunds apply only to undelivered orders' });
      }
      // require estimatedDeliveryDate or paidAt to compute delay
      const est = order.estimatedDeliveryDate || order.paidAt;
      if (!est) {
        return res.status(400).json({ message: 'Estimated delivery date not available to validate delay' });
      }
      const diffDays = Math.floor((now - new Date(est)) / (1000 * 60 * 60 * 24));
      if (diffDays < 5) {
        return res.status(400).json({ message: 'Delay-based refunds are allowed only after 5 days past the estimated delivery date' });
      }
    }
    // 'other' can be used for delivered orders within 7 days
    if (criteria === 'other') {
      if (!order.isDelivered || !deliveredAt) {
        return res.status(400).json({ message: 'Other refund reasons require the order to be delivered first' });
      }
      const daysSinceDelivery = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24));
      if (daysSinceDelivery > 7) {
        return res.status(400).json({ message: 'Other refund reasons must be requested within 7 days of delivery' });
      }
    }

    order.refundStatus = 'requested';
    order.refundCriteria = criteria;
    order.refundReason = (details && details.trim()) || (req.body.reason && String(req.body.reason).trim()) || 'Refund requested';
    order.refundRequestedAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    console.error('requestOrderRefund error:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// @desc    Verify Chapa payment (called after user returns from Chapa)
// @route   POST /api/orders/:id/chapa/verify
// @access  Private
const verifyChapaPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { tx_ref } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Transaction reference is required' });
    }

    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Already paid → return order
    if (order.isPaid) {
      const populatedOrder = await Order.findById(orderId).populate('user', 'name email');
      return res.json(populatedOrder);
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaSecretKey) {
      return res.status(500).json({ message: 'Chapa secret key not configured' });
    }

    const chapaBase = (process.env.CHAPA_API_HOST || 'https://api.chapa.co').replace(/\/$/, '');
    const verifyUrl = `${chapaBase}/v1/transaction/verify/${tx_ref}`;
    const response = await axios.get(verifyUrl, {
      headers: { Authorization: `Bearer ${chapaSecretKey}` },
      timeout: 30000,
    });

    const chapaData = response.data;
    console.log('Chapa Verify Response:', chapaData);

    if (chapaData.status !== 'success' || !chapaData.data) {
      await Order.findByIdAndDelete(orderId);
      return res.status(400).json({ message: 'Payment verification failed. Pending order cancelled.' });
    }

    const transaction = chapaData.data;
    if (String(transaction.status).toLowerCase() !== 'success') {
      await Order.findByIdAndDelete(orderId);
      return res.status(400).json({ message: 'Payment not successful. Pending order cancelled.' });
    }

    const amountPaid = Number(transaction.amount || transaction.total_amount || 0);
    const orderTotal = Number(order.totalPrice || 0);
    if (amountPaid && orderTotal && Math.abs(amountPaid - orderTotal) > 0.01) {
      await Order.findByIdAndDelete(orderId);
      return res.status(400).json({ message: 'Payment amount does not match order total. Pending order cancelled.' });
    }

    // ---- Stock reduction for Chapa orders (only once) ----
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.countInStock -= item.qty;
        await product.save();
        console.log(`📦 Stock reduced for ${product.name}: now ${product.countInStock}`);
      }
    }

    // Mark order as paid
    order.isPaid = true;
    order.paymentStatus = 'success';
    order.paidAt = Date.now();
    order.tx_ref = tx_ref;
    order.paymentResult = {
      id: transaction.reference || transaction.id || tx_ref,
      status: transaction.status,
      update_time: transaction.updated_at || new Date().toISOString(),
      email_address: transaction.email || transaction.customer?.email || '',
    };

    // Seller revenue distribution
    const sellerRevenueMap = new Map();
    for (const item of order.orderItems) {
      if (!item.seller) continue;
      const sellerId = item.seller.toString();
      const current = sellerRevenueMap.get(sellerId) || 0;
      sellerRevenueMap.set(sellerId, current + Number(item.sellerRevenue || 0));
    }

    for (const [sellerId, amount] of sellerRevenueMap.entries()) {
      if (amount <= 0) continue;
      const existingTx = await SellerWalletTransaction.findOne({
        seller: sellerId,
        order: order._id,
        type: 'CREDIT',
      });
      if (!existingTx) {
        await Seller.findByIdAndUpdate(sellerId, { $inc: { walletBalance: amount } });
        try {
          await SellerWalletTransaction.create({
            seller: sellerId,
            order: order._id,
            amount,
            type: 'CREDIT',
            note: `Order payment settled: ${order._id}`,
          });
        } catch (createErr) {
          if (createErr.code !== 11000) throw createErr;
        }
      }
    }

    const updatedOrder = await order.save();
    const populatedOrder = await Order.findById(orderId).populate('user', 'name email');

    // Notify all connected clients that an order was paid via Chapa
    if (req.io) req.io.emit('peer-order-placed', { operationType: 'update' });

    res.json(populatedOrder);
  } catch (error) {
    console.error('Verify Chapa Error:', error.response?.data || error.message);
    if (error.code === 'ENOTFOUND') {
      return res.status(503).json({ message: 'Cannot resolve Chapa API host. Check server network or CHAPA_API_HOST env var.' });
    }
    res.status(500).json({ message: error.response?.data?.message || error.message || 'Server error' });
  }
};

// @desc    Cancel a pending (unpaid) order
// @route   DELETE /api/orders/:id/cancel
// @access  Private (Buyer)
const cancelPendingOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (order.isPaid) {
      return res.status(400).json({ message: 'Cannot cancel a paid order' });
    }

    // If stock was reserved (for COD), release it
    if (order.paymentMethod !== 'Chapa') {
      await releaseOrderStock(order.orderItems);
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pending order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Remove order from user's list (soft delete or permanent)
// @route   DELETE /api/orders/:id/remove
// @access  Private
const removeUserOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  // Option 1: Hard delete
  await order.deleteOne();
  // Option 2: Soft delete – add a field `hiddenFromUser: true` and filter in getMyOrders
  // For now, hard delete.
  res.json({ message: 'Order removed successfully' });
};

module.exports = {
  addOrderItems,
  getOrderById,
  getMyOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  requestOrderRefund,
  verifyChapaPayment,
  cancelPendingOrder,
  removeUserOrder,
};