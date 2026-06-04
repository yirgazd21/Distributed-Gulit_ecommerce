const mongoose = require('mongoose');
const User = require('../models/userModel');
const Order = require('../models/orderModel');

// @desc    Get users for admin management
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsersForAdmin = async (req, res) => {
  const {
    keyword = '',
    role = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const filter = {};
  const trimmedKeyword = String(keyword || '').trim();
  if (trimmedKeyword) {
    const regex = new RegExp(trimmedKeyword, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }
  if (role !== 'all') {
    filter.role = role;
  }

  const sortableFields = {
    createdAt: 'createdAt',
    name: 'name',
    email: 'email',
    role: 'role',
    paidOrders: 'paidOrdersCount',
    totalSpent: 'totalSpent',
  };
  const sortField = sortableFields[sortBy] || 'createdAt';
  const direction = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const sortStage = { [sortField]: direction, _id: 1 };

  const [result] = await User.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'orders',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$user', '$$userId'] },
              isPaid: true,
            },
          },
          {
            $group: {
              _id: null,
              paidOrdersCount: { $sum: 1 },
              totalSpent: { $sum: { $ifNull: ['$totalPrice', 0] } },
            },
          },
        ],
        as: 'orderStats',
      },
    },
    {
      $addFields: {
        paidOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.paidOrdersCount', 0] }, 0] },
        totalSpent: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalSpent', 0] }, 0] },
      },
    },
    {
      $project: {
        password: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        orderStats: 0,
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        users: [{ $skip: skip }, { $limit: normalizedLimit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ]);

  const users = result?.users || [];
  const total = result?.metadata?.[0]?.total || 0;
  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    users,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Update user role by admin
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRoleByAdmin = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (!['buyer', 'admin'].includes(String(role))) {
    return res.status(400).json({ message: 'Role must be buyer or admin' });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (String(req.user._id) === String(targetUser._id) && role !== 'admin') {
    return res.status(400).json({ message: 'You cannot remove your own admin role' });
  }

  if (targetUser.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'At least one admin account must remain' });
    }
  }

  targetUser.role = role;
  const updated = await targetUser.save();

  return res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    message: 'User role updated',
  });
};

module.exports = {
  getUsersForAdmin,
  updateUserRoleByAdmin,
};
