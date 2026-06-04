const Order = require('../models/orderModel');
const mongoose = require('mongoose');

// @desc    Get orders for admin disputes queue
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrdersForAdmin = async (req, res) => {
  const {
    page = 1,
    limit = 12,
    keyword = '',
    payment = 'all',
    delivery = 'all',
    dispute = 'all',
    risk = 'all',
  } = req.query;

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const trimmedKeyword = String(keyword || '').trim();

  const now = new Date();
  const overdue3 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const overdue7 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
  const overdue14 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);

  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    {
      $unwind: {
        path: '$buyer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        buyerName: '$buyer.name',
        buyerEmail: '$buyer.email',
        orderIdStr: { $toString: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'sellers',
        localField: 'orderItems.seller',
        foreignField: '_id',
        as: 'sellerDocs',
      },
    },
    {
      $addFields: {
        sellerNames: {
          $setUnion: [
            {
              $map: {
                input: '$sellerDocs',
                as: 'seller',
                in: '$$seller.shopName',
              },
            },
            [],
          ],
        },
        sellerEmails: {
          $setUnion: [
            {
              $map: {
                input: '$sellerDocs',
                as: 'seller',
                in: '$$seller.email',
              },
            },
            [],
          ],
        },
      },
    },
  ];

  if (payment === 'paid') pipeline.push({ $match: { isPaid: true } });
  if (payment === 'unpaid') pipeline.push({ $match: { isPaid: false } });

  if (delivery === 'delivered') pipeline.push({ $match: { isDelivered: true } });
  if (delivery === 'pending') pipeline.push({ $match: { isDelivered: false } });

  if (dispute !== 'all') pipeline.push({ $match: { disputeStatus: dispute } });

  if (risk === 'watch') {
    pipeline.push({ $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue3, $gt: overdue7 } } });
  } else if (risk === 'overdue') {
    pipeline.push({ $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue7 } } });
  } else if (risk === 'high') {
    pipeline.push({ $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue14 } } });
  } else if (risk === 'unpaidAging') {
    pipeline.push({ $match: { isPaid: false, createdAt: { $lte: overdue7 } } });
  }

  if (trimmedKeyword) {
    const regex = new RegExp(trimmedKeyword, 'i');
    pipeline.push({
      $match: {
        $or: [{ orderIdStr: regex }, { buyerName: regex }, { buyerEmail: regex }, { sellerNames: regex }, { sellerEmails: regex }],
      },
    });
  }

  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({
    $facet: {
      orders: [{ $skip: skip }, { $limit: normalizedLimit }],
      metadata: [{ $count: 'total' }],
    },
  });

  const [result] = await Order.aggregate(pipeline);
  const orders = (result?.orders || []).map((order) => {
    const daysSincePaid = order.paidAt
      ? Math.floor((now.getTime() - new Date(order.paidAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysSinceCreated = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    let riskLevel = 'none';
    if (order.isPaid && !order.isDelivered) {
      if (daysSincePaid >= 14) riskLevel = 'high';
      else if (daysSincePaid >= 7) riskLevel = 'overdue';
      else if (daysSincePaid >= 3) riskLevel = 'watch';
    } else if (!order.isPaid && daysSinceCreated >= 7) {
      riskLevel = 'unpaidAging';
    }

    return {
      ...order,
      sellerCount: Array.isArray(order.sellerNames) ? order.sellerNames.length : 0,
      daysSincePaid,
      daysSinceCreated,
      riskLevel,
      disputeReady: riskLevel === 'high' || riskLevel === 'overdue',
    };
  });
  const total = result?.metadata?.[0]?.total || 0;
  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    orders,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Update order dispute status by admin
// @route   PATCH /api/admin/orders/:id/dispute
// @access  Private/Admin
const updateOrderDisputeByAdmin = async (req, res) => {
  const { id } = req.params;
  const { disputeStatus, disputeNote = '' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }
  const allowed = ['none', 'open', 'in_review', 'resolved', 'rejected'];
  if (!allowed.includes(String(disputeStatus))) {
    return res.status(400).json({ message: 'Invalid dispute status' });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.disputeStatus = disputeStatus;
  order.disputeNote = String(disputeNote || '').trim();
  order.disputeUpdatedAt = new Date();
  await order.save();

  return res.json({
    _id: order._id,
    disputeStatus: order.disputeStatus,
    disputeNote: order.disputeNote,
    disputeUpdatedAt: order.disputeUpdatedAt,
    message: 'Dispute status updated',
  });
};

module.exports = {
  getOrdersForAdmin,
  updateOrderDisputeByAdmin,
};
