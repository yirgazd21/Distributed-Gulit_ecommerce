const axios = require('axios');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Seller = require('../models/sellerModel');
const SellerWalletTransaction = require('../models/sellerWalletTransactionModel');

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Retries a DB save when a transient replica-set error occurs (e.g. election
// in progress after one node goes down). Waits delayMs between attempts so the
// new primary has time to be elected before retrying.
const saveWithRetry = async (doc, retries = 6, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await doc.save();
    } catch (err) {
      const isTransient =
        err.name === 'MongoNetworkError' ||
        err.name === 'MongoNetworkTimeoutError' ||
        err.name === 'MongoServerSelectionError' ||
        (err.message && (
          err.message.includes('timed out') ||
          err.message.includes('connection') ||
          err.message.includes('topology') ||
          err.message.includes('no primary') ||
          err.message.includes('election')
        ));

      if (isTransient && attempt < retries) {
        console.warn(`[DB] Save attempt ${attempt} failed (${err.message}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
};

// ─── Reserve stock ────────────────────────────────────────────────────────────
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
    await saveWithRetry(product);
  }
};

// ─── Verify Chapa payment ─────────────────────────────────────────────────────
const verifyChapaPayment = async (req, res) => {
  try {
    const { tx_ref } = req.body;
    const orderId = req.params.id;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Transaction reference is required for Chapa verification' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to verify this order' });
    }
    if (order.isPaid) {
      return res.json(order);
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaSecretKey) {
      return res.status(500).json({ message: 'Chapa secret key is not configured' });
    }

    const chapaBase = (process.env.CHAPA_API_HOST || 'https://api.chapa.co').replace(/\/$/, '');
    const verifyUrl = `${chapaBase}/v1/transaction/verify/${tx_ref}`;
    const response = await axios.get(verifyUrl, {
      headers: { Authorization: `Bearer ${chapaSecretKey}` },
      timeout: 30000,
    });

    const verification = response.data;
    if (!verification || verification.status !== 'success' || !verification.data) {
      return res.status(402).json({ message: 'Chapa payment verification failed' });
    }

    const transaction = verification.data;
    if (String(transaction.status).toLowerCase() !== 'success') {
      return res.status(402).json({ message: 'Chapa payment is not completed' });
    }

    const amountPaid = Number(transaction.amount || 0);
    if (amountPaid !== Number(order.totalPrice)) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    await reserveOrderStock(order.orderItems);

    order.isPaid = true;
    order.paymentStatus = 'success';
    order.paidAt = Date.now();
    order.paymentResult = {
      id: transaction.id || transaction.tx_ref || tx_ref,
      status: transaction.status || 'success',
      update_time: transaction.paid_at || new Date().toISOString(),
      email_address: transaction.customer_email || req.user.email || '',
    };

    const sellerRevenueMap = new Map();
    for (const item of order.orderItems) {
      if (!item.seller) continue;
      const sellerId = item.seller.toString();
      sellerRevenueMap.set(sellerId, (sellerRevenueMap.get(sellerId) || 0) + Number(item.sellerRevenue || 0));
    }

    for (const [sellerId, amount] of sellerRevenueMap.entries()) {
      if (amount <= 0) continue;
      const existingTx = await SellerWalletTransaction.findOne({ seller: sellerId, order: order._id, type: 'CREDIT' });
      if (!existingTx) {
        await Seller.findByIdAndUpdate(sellerId, { $inc: { walletBalance: amount } });
        await SellerWalletTransaction.create({
          seller: sellerId, order: order._id, amount, type: 'CREDIT',
          note: `Order payment settled: ${order._id}`,
        });
      }
    }

    const updatedOrder = await saveWithRetry(order);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Verify Chapa Error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// ─── Initialize Chapa payment ─────────────────────────────────────────────────
const initializeChapaPayment = async (req, res) => {
  try {
    console.log('========== CHAPA PAYMENT INIT ==========');
    console.log('orderItems received:', req.body.orderItems?.length, 'items');
    console.log('amount:', req.body.amount, 'email:', req.body.email);

    const {
      amount, email, first_name, last_name, tx_ref,
      orderItems, shippingAddress, paymentMethod,
      itemsPrice, shippingPrice, taxPrice, totalPrice,
    } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!tx_ref) return res.status(400).json({ message: 'Transaction reference is required' });
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaSecretKey) return res.status(500).json({ message: 'Chapa secret key not configured' });

    // 1. Create the pending order in DB (with retry for replica set election)
    const calculatedItems = orderItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price,
      product: item._id,
      seller: item.user || item.seller,
      platformFee: (item.price * item.qty) * 0.10,
      sellerRevenue: (item.price * item.qty) * 0.90,
    }));

    const order = new Order({
      user: req.user._id,
      orderItems: calculatedItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'Chapa',
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      paymentStatus: 'pending',
      tx_ref,
    });

    // save order
    let savedOrder;

try {
  savedOrder = await saveWithRetry(order, 2, 2000);
} catch (dbError) {
  console.error('Order save failed:', dbError.message);

  return res.status(503).json({
    success: false,
    message: 'Database temporarily unavailable. Please try again.',
  });
}

    // 2. Initialize Chapa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const chapaBase = (process.env.CHAPA_API_HOST || 'https://api.chapa.co').replace(/\/$/, '');

    const chapaRequestData = {
      amount: Number(amount).toFixed(2),
      currency: 'ETB',
      email: email.trim(),
      first_name: first_name?.trim() || 'Gulit',
      last_name: last_name?.trim() || 'Customer',
      tx_ref,
      callback_url: `${baseUrl}/api/orders/chapa/callback`,
      return_url: `${frontendUrl}/order-success?order_id=${savedOrder._id}&tx_ref=${tx_ref}`,
      title: 'Gulit Marketplace',
      description: `Payment for order ${savedOrder._id}`,
    };

    console.log('Sending to Chapa:', JSON.stringify(chapaRequestData, null, 2));

    const response = await axios.post(
      `${chapaBase}/v1/transaction/initialize`,
      chapaRequestData,
      {
        headers: {
          Authorization: `Bearer ${chapaSecretKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.status === 'success') {
      const checkoutUrl = response.data.data?.checkout_url;
      if (!checkoutUrl) {
        await Order.findByIdAndDelete(savedOrder._id);
        return res.status(500).json({ message: 'No checkout URL received from Chapa' });
      }

      console.log('✅ Payment initialized! Order:', savedOrder._id);
      return res.status(200).json({
        success: true,
        checkout_url: checkoutUrl,
        tx_ref,
        orderId: savedOrder._id,
      });
    } else {
      await Order.findByIdAndDelete(savedOrder._id);
      return res.status(400).json({
        success: false,
        message: response.data?.message || 'Chapa initialization failed',
      });
    }

  } catch (error) {
    console.error('═══════════════════════════════════════');
    console.error('CHAPA INIT ERROR:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    if (error.response) {
      console.error('Chapa HTTP status:', error.response.status);
      console.error('Chapa response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.request) {
      console.error('No response received from Chapa (network/timeout)');
    }
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════');

    // DB temporarily unavailable (replica set election in progress)
    const isDbError =
      error.name === 'MongoNetworkError' ||
      error.name === 'MongoNetworkTimeoutError' ||
      error.name === 'MongoServerSelectionError' ||
      (error.message && (
        error.message.includes('timed out') ||
        error.message.includes('topology') ||
        error.message.includes('no primary')
      ));

    if (isDbError) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable. Please try again in a few seconds.',
      });
    }

    if (error.code === 'ENOTFOUND') {
      return res.status(503).json({ success: false, message: 'Cannot resolve Chapa API host. Check server network or CHAPA_API_HOST env var.' });
    }
    if (error.response) {
      return res.status(error.response.status || 400).json({
        success: false,
        message: error.response.data?.message || 'Chapa payment failed',
        details: error.response.data,
      });
    }
    if (error.request) {
      return res.status(503).json({ success: false, message: 'Cannot connect to Chapa payment gateway' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = { verifyChapaPayment, initializeChapaPayment };
