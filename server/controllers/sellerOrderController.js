const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Seller = require('../models/sellerModel');
const SellerWalletTransaction = require('../models/sellerWalletTransactionModel');

// @desc    Get all orders containing the logged-in seller's products
// @route   GET /api/sellers/orders
// @access  Private/Seller
const getSellerOrders = async (req, res) => {
  try {
    // 1. Find all product IDs that belong to this specific seller
    const sellerProducts = await Product.find({ seller: req.seller._id }).select('_id');
    const sellerProductIds = sellerProducts.map(product => product._id);

    // 2. Find all orders that contain at least one of those product IDs
    // We populate 'user' to get the buyer's name and email
    const orders = await Order.find({
      'orderItems.product': { $in: sellerProductIds }
    })
    .populate('user', 'id name email')
    .sort({ createdAt: -1 }); // Newest orders first

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch seller orders', error: error.message });
  }
};

// @desc    Get order by ID for seller
// @route   GET /api/sellers/orders/:id
// @access  Private/Seller
const getSellerOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify this seller owns at least one item in the order
    const sellerId = req.seller._id.toString();
    const ownsItem = (order.orderItems || []).some(
      (item) => item.seller?.toString() === sellerId
    );
    if (!ownsItem) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update order status to delivered
// @route   PUT /api/sellers/orders/:id/deliver
// @access  Private/Seller
const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify this seller owns at least one item in the order
    const sellerId = req.seller._id.toString();
    const ownsItem = (order.orderItems || []).some(
      (item) => item.seller?.toString() === sellerId
    );
    if (!ownsItem) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.deliveryStatus = 'delivered';
    order.isDelivered = true;
    if (!order.deliveredAt) {
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update seller order delivery status and estimated delivery date
// @route   PUT /api/sellers/orders/:id/status
// @access  Private/Seller
const updateSellerOrderStatus = async (req, res) => {
  try {
    const { deliveryStatus, estimatedDeliveryDate } = req.body;
    const validStatuses = ['pending', 'preparing', 'out_for_delivery', 'delivered'];

    if (!deliveryStatus || !validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({ message: 'Invalid delivery status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify this seller owns at least one item in the order
    const sellerId = req.seller._id.toString();
    const ownsItem = (order.orderItems || []).some(
      (item) => item.seller?.toString() === sellerId
    );
    if (!ownsItem) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.deliveryStatus = deliveryStatus;
    order.estimatedDeliveryDate = estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : order.estimatedDeliveryDate;

    if (deliveryStatus === 'delivered') {
      order.isDelivered = true;
      if (!order.deliveredAt) {
        order.deliveredAt = Date.now();
      }
    } else {
      order.isDelivered = false;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Complete buyer refund request for a seller order
// @route   PUT /api/sellers/orders/:id/refund/complete
// @access  Private/Seller
const completeOrderRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const sellerId = req.seller._id.toString();
    const sellerItems = (order.orderItems || []).filter((item) => item.seller?.toString() === sellerId);

    if (sellerItems.length === 0) {
      return res.status(403).json({ message: 'Not authorized to refund this order' });
    }

    if (!order.isPaid) {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }

    if (order.refundStatus !== 'requested') {
      return res.status(400).json({ message: 'No pending refund request for this order' });
    }

    const refundAmount = sellerItems.reduce((sum, item) => sum + Number(item.sellerRevenue || 0), 0);

    const existingDebit = await SellerWalletTransaction.findOne({
      seller: sellerId,
      order: order._id,
      type: 'DEBIT',
    });

    if (!existingDebit && refundAmount > 0) {
      await Seller.findByIdAndUpdate(sellerId, { $inc: { walletBalance: -refundAmount } });
      await SellerWalletTransaction.create({
        seller: sellerId,
        order: order._id,
        amount: refundAmount,
        type: 'DEBIT',
        note: `Refund completed: ${order._id}`,
      });
    }

    order.refundStatus = 'completed';
    order.refundedAt = Date.now();
    order.refundAmount = refundAmount;
    order.disputeStatus = 'resolved';
    order.disputeNote = order.disputeNote || 'Refund completed by seller';
    order.disputeUpdatedAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Reject buyer refund request for a seller order
// @route   PUT /api/sellers/orders/:id/refund/reject
// @access  Private/Seller
const rejectOrderRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const sellerId = req.seller._id.toString();
    const ownsItem = (order.orderItems || []).some((item) => item.seller?.toString() === sellerId);

    if (!ownsItem) {
      return res.status(403).json({ message: 'Not authorized to reject this refund' });
    }

    if (order.refundStatus !== 'requested') {
      return res.status(400).json({ message: 'No pending refund request for this order' });
    }

    order.refundStatus = 'rejected';
    order.disputeStatus = 'rejected';
    order.disputeNote = req.body.reason || 'Refund request rejected by seller';
    order.disputeUpdatedAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getSellerOrders, getSellerOrderById, updateOrderToDelivered, updateSellerOrderStatus, completeOrderRefund, rejectOrderRefund };
