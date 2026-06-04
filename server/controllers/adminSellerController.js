const Seller = require('../models/sellerModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const SellerWalletTransaction = require('../models/sellerWalletTransactionModel');
const AdminSellerActivity = require('../models/adminSellerActivityModel');
const mongoose = require('mongoose');

const logSellerActivity = async ({ sellerId, adminId, action, note = '', metadata = {} }) => {
  await AdminSellerActivity.create({
    seller: sellerId,
    admin: adminId,
    action,
    note,
    metadata,
  });
};

const buildActivityFilter = ({ sellerId, action, severity, dateFrom, dateTo }) => {
  const filter = { seller: sellerId };

  if (action && action !== 'all') {
    filter.action = action;
  }
  if (severity && severity !== 'all') {
    filter['metadata.severity'] = severity;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const start = new Date(dateFrom);
      if (!Number.isNaN(start.getTime())) filter.createdAt.$gte = start;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (!filter.createdAt.$gte && !filter.createdAt.$lte) {
      delete filter.createdAt;
    }
  }

  return filter;
};

const buildSellerListFilter = ({ status = 'all', keyword = '', category = 'all', country = 'all' }) => {
  const filter = {};
  const trimmedKeyword = String(keyword || '').trim();

  if (trimmedKeyword) {
    const regex = new RegExp(trimmedKeyword, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { shopName: regex },
      { phoneNumber: regex },
      { nationalIdNumber: regex },
    ];
  }

  if (status === 'pending') {
    filter.isApproved = false;
    filter.isActive = true;
  } else if (status === 'approved') {
    filter.isApproved = true;
    filter.isActive = true;
  } else if (status === 'suspended') {
    filter.isActive = false;
  }

  if (category !== 'all') {
    filter.shopCategory = category;
  }
  if (country !== 'all') {
    filter['address.country'] = country;
  }

  return filter;
};

const buildSellerSortStage = ({ sortBy = 'createdAt', sortOrder = 'desc' }) => {
  const sortableFields = {
    createdAt: 'createdAt',
    shopName: 'shopName',
    ownerName: 'name',
    paidOrders: 'paidOrdersCount',
    deliveredOrders: 'deliveredOrdersCount',
    lateOrders: 'lateOrdersCount',
    deliveryRate: 'deliveryRate',
    pendingOrders: 'pendingOrdersCount',
    revenue: 'totalRevenue',
    products: 'totalProducts',
  };
  const sortField = sortableFields[sortBy] || 'createdAt';
  const direction = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  return { [sortField]: direction, _id: 1 };
};

// @desc    Get sellers for admin review
// @route   GET /api/admin/sellers
// @access  Private/Admin
const getSellersForAdmin = async (req, res) => {
  const {
    status = 'all',
    keyword = '',
    category = 'all',
    country = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const overdue7 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const filter = buildSellerListFilter({ status, keyword, category, country });
  const sortStage = buildSellerSortStage({ sortBy, sortOrder });

  const [result] = await Seller.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'products',
        let: { sellerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$seller', '$$sellerId'] } } },
          { $count: 'totalProducts' },
        ],
        as: 'productStats',
      },
    },
    {
      $lookup: {
        from: 'orders',
        let: { sellerId: '$_id' },
        pipeline: [
          { $unwind: '$orderItems' },
          { $match: { $expr: { $eq: ['$orderItems.seller', '$$sellerId'] } } },
          {
            $group: {
              _id: '$_id',
              isPaid: { $first: '$isPaid' },
              isDelivered: { $first: '$isDelivered' },
              paidAt: { $first: '$paidAt' },
              sellerRevenue: { $sum: { $ifNull: ['$orderItems.sellerRevenue', 0] } },
            },
          },
          {
            $group: {
              _id: null,
              totalOrdersCount: { $sum: 1 },
              totalRevenue: {
                $sum: {
                  $cond: [{ $eq: ['$isPaid', true] }, '$sellerRevenue', 0],
                },
              },
              paidOrdersCount: {
                $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] },
              },
              pendingOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$isPaid', true] },
                        { $eq: ['$isDelivered', false] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              deliveredOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$isPaid', true] },
                        { $eq: ['$isDelivered', true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              lateOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$isPaid', true] },
                        { $eq: ['$isDelivered', false] },
                        { $lte: ['$paidAt', overdue7] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: 'orderStats',
      },
    },
    {
      $addFields: {
        totalProducts: { $ifNull: [{ $arrayElemAt: ['$productStats.totalProducts', 0] }, 0] },
        totalOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrdersCount', 0] }, 0] },
        totalRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalRevenue', 0] }, 0] },
        paidOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.paidOrdersCount', 0] }, 0] },
        pendingOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.pendingOrdersCount', 0] }, 0] },
        deliveredOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.deliveredOrdersCount', 0] }, 0] },
        lateOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.lateOrdersCount', 0] }, 0] },
      },
    },
    {
      $addFields: {
        deliveryRate: {
          $cond: [
            { $gt: ['$paidOrdersCount', 0] },
            {
              $multiply: [
                { $divide: ['$deliveredOrdersCount', '$paidOrdersCount'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        password: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        productStats: 0,
        orderStats: 0,
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        sellers: [{ $skip: skip }, { $limit: normalizedLimit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ]);

  const sellers = result?.sellers || [];
  const total = result?.metadata?.[0]?.total || 0;
  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  res.json({
    sellers,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Export sellers for admin (CSV)
// @route   GET /api/admin/sellers/export
// @access  Private/Admin
const exportSellersForAdmin = async (req, res) => {
  const {
    status = 'all',
    keyword = '',
    category = 'all',
    country = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const overdue7 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const filter = buildSellerListFilter({ status, keyword, category, country });
  const sortStage = buildSellerSortStage({ sortBy, sortOrder });

  const sellers = await Seller.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'products',
        let: { sellerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$seller', '$$sellerId'] } } },
          { $count: 'totalProducts' },
        ],
        as: 'productStats',
      },
    },
    {
      $lookup: {
        from: 'orders',
        let: { sellerId: '$_id' },
        pipeline: [
          { $unwind: '$orderItems' },
          { $match: { $expr: { $eq: ['$orderItems.seller', '$$sellerId'] } } },
          {
            $group: {
              _id: '$_id',
              isPaid: { $first: '$isPaid' },
              isDelivered: { $first: '$isDelivered' },
              paidAt: { $first: '$paidAt' },
              sellerRevenue: { $sum: { $ifNull: ['$orderItems.sellerRevenue', 0] } },
            },
          },
          {
            $group: {
              _id: null,
              totalOrdersCount: { $sum: 1 },
              totalRevenue: {
                $sum: {
                  $cond: [{ $eq: ['$isPaid', true] }, '$sellerRevenue', 0],
                },
              },
              paidOrdersCount: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] } },
              pendingOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$isPaid', true] }, { $eq: ['$isDelivered', false] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              deliveredOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$isPaid', true] }, { $eq: ['$isDelivered', true] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              lateOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$isPaid', true] },
                        { $eq: ['$isDelivered', false] },
                        { $lte: ['$paidAt', overdue7] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: 'orderStats',
      },
    },
    {
      $addFields: {
        totalProducts: { $ifNull: [{ $arrayElemAt: ['$productStats.totalProducts', 0] }, 0] },
        totalOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrdersCount', 0] }, 0] },
        totalRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalRevenue', 0] }, 0] },
        paidOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.paidOrdersCount', 0] }, 0] },
        pendingOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.pendingOrdersCount', 0] }, 0] },
        deliveredOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.deliveredOrdersCount', 0] }, 0] },
        lateOrdersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.lateOrdersCount', 0] }, 0] },
      },
    },
    {
      $addFields: {
        deliveryRate: {
          $cond: [
            { $gt: ['$paidOrdersCount', 0] },
            {
              $multiply: [{ $divide: ['$deliveredOrdersCount', '$paidOrdersCount'] }, 100],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        phoneNumber: 1,
        shopName: 1,
        shopCategory: 1,
        'address.country': 1,
        isApproved: 1,
        isActive: 1,
        walletBalance: 1,
        totalProducts: 1,
        totalOrdersCount: 1,
        paidOrdersCount: 1,
        deliveredOrdersCount: 1,
        pendingOrdersCount: 1,
        lateOrdersCount: 1,
        deliveryRate: 1,
        totalRevenue: 1,
        createdAt: 1,
      },
    },
    { $sort: sortStage },
  ]);

  const headers = [
    'Seller ID',
    'Shop Name',
    'Owner Name',
    'Email',
    'Phone',
    'Category',
    'Country',
    'Approved',
    'Active',
    'Products',
    'Orders Total',
    'Paid Orders',
    'Delivered Orders',
    'Pending Orders',
    'Late Orders',
    'Delivery Rate (%)',
    'Revenue (ETB)',
    'Wallet Balance (ETB)',
    'Created At',
  ];

  const escapeCsv = (value) => {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const rows = sellers.map((seller) =>
    [
      seller._id,
      seller.shopName,
      seller.name,
      seller.email,
      seller.phoneNumber,
      seller.shopCategory,
      seller.address?.country,
      seller.isApproved ? 'Yes' : 'No',
      seller.isActive ? 'Yes' : 'No',
      Number(seller.totalProducts || 0),
      Number(seller.totalOrdersCount || 0),
      Number(seller.paidOrdersCount || 0),
      Number(seller.deliveredOrdersCount || 0),
      Number(seller.pendingOrdersCount || 0),
      Number(seller.lateOrdersCount || 0),
      Number(seller.deliveryRate || 0).toFixed(2),
      Number(seller.totalRevenue || 0).toFixed(2),
      Number(seller.walletBalance || 0).toFixed(2),
      seller.createdAt ? new Date(seller.createdAt).toISOString() : '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sellers-export-${timestamp}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
  res.status(200).send(csv);
};

// @desc    Update seller status (approve/suspend/reactivate)
// @route   PATCH /api/admin/sellers/:id/status
// @access  Private/Admin
const updateSellerStatusByAdmin = async (req, res) => {
  const { id } = req.params;
  const { isApproved, isActive, note = '' } = req.body;

  const seller = await Seller.findById(id);
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const previous = {
    isApproved: seller.isApproved,
    isActive: seller.isActive,
  };

  if (typeof isApproved === 'boolean') {
    seller.isApproved = isApproved;
  }
  if (typeof isActive === 'boolean') {
    seller.isActive = isActive;
  }

  const activeStatusChanged = previous.isActive !== seller.isActive;
  if (activeStatusChanged && !String(note || '').trim()) {
    return res.status(400).json({ message: 'Reason note is required for suspend/reactivate actions' });
  }

  const updated = await seller.save();

  const statusChangeParts = [];
  if (previous.isApproved !== updated.isApproved) {
    statusChangeParts.push(`isApproved: ${previous.isApproved} -> ${updated.isApproved}`);
  }
  if (previous.isActive !== updated.isActive) {
    statusChangeParts.push(`isActive: ${previous.isActive} -> ${updated.isActive}`);
  }

  if (statusChangeParts.length > 0 || note) {
    await logSellerActivity({
      sellerId: updated._id,
      adminId: req.user._id,
      action: 'STATUS_UPDATE',
      note,
      metadata: {
        previous,
        current: {
          isApproved: updated.isApproved,
          isActive: updated.isActive,
        },
        statusChange: statusChangeParts.join(', '),
      },
    });
  }

  return res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    shopName: updated.shopName,
    isApproved: updated.isApproved,
    isActive: updated.isActive,
    message: 'Seller status updated',
  });
};

// @desc    Add admin note for seller
// @route   POST /api/admin/sellers/:id/notes
// @access  Private/Admin
const addSellerAdminNote = async (req, res) => {
  const { id } = req.params;
  const { note, severity = 'low' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }
  if (!String(note || '').trim()) {
    return res.status(400).json({ message: 'Note is required' });
  }

  const seller = await Seller.findById(id).select('_id');
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const normalizedSeverity = ['low', 'medium', 'high'].includes(String(severity).toLowerCase())
    ? String(severity).toLowerCase()
    : 'low';

  await logSellerActivity({
    sellerId: seller._id,
    adminId: req.user._id,
    action: 'NOTE',
    note: String(note).trim(),
    metadata: {
      severity: normalizedSeverity,
    },
  });

  return res.status(201).json({ message: 'Admin note saved' });
};

// @desc    Get seller activity timeline for admin
// @route   GET /api/admin/sellers/:id/activity
// @access  Private/Admin
const getSellerActivityForAdmin = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10, action = 'all', severity = 'all', dateFrom = '', dateTo = '' } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }

  const seller = await Seller.findById(id).select('_id');
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const filter = buildActivityFilter({
    sellerId: seller._id,
    action: String(action || 'all'),
    severity: String(severity || 'all'),
    dateFrom: String(dateFrom || ''),
    dateTo: String(dateTo || ''),
  });

  const [activities, total] = await Promise.all([
    AdminSellerActivity.find(filter)
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit),
    AdminSellerActivity.countDocuments(filter),
  ]);

  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    activities,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Get seller detail workspace data for admin
// @route   GET /api/admin/sellers/:id
// @access  Private/Admin
const getSellerDetailsForAdmin = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }

  const sellerId = new mongoose.Types.ObjectId(id);
  const now = new Date();
  const overdue3 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const overdue7 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
  const overdue14 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);

  const seller = await Seller.findById(sellerId).select('-password -resetPasswordToken -resetPasswordExpires');
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const [summaryAgg, riskAgg, recentProducts, recentOrdersRaw, recentTransactions] = await Promise.all([
    Order.aggregate([
      { $unwind: '$orderItems' },
      { $match: { 'orderItems.seller': sellerId } },
      {
        $group: {
          _id: '$_id',
          isPaid: { $first: '$isPaid' },
          isDelivered: { $first: '$isDelivered' },
          paidAt: { $first: '$paidAt' },
          deliveredAt: { $first: '$deliveredAt' },
          createdAt: { $first: '$createdAt' },
          sellerRevenue: { $sum: { $ifNull: ['$orderItems.sellerRevenue', 0] } },
          platformFee: { $sum: { $ifNull: ['$orderItems.platformFee', 0] } },
          itemCount: { $sum: '$orderItems.qty' },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          paidOrdersCount: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] } },
          pendingOrdersCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$isPaid', true] }, { $eq: ['$isDelivered', false] }],
                },
                1,
                0,
              ],
            },
          },
          deliveredOrdersCount: { $sum: { $cond: [{ $eq: ['$isDelivered', true] }, 1, 0] } },
          unpaidOrdersCount: { $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] } },
          sellerRevenue: {
            $sum: {
              $cond: [{ $eq: ['$isPaid', true] }, '$sellerRevenue', 0],
            },
          },
          platformContribution: {
            $sum: {
              $cond: [{ $eq: ['$isPaid', true] }, '$platformFee', 0],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $unwind: '$orderItems' },
      { $match: { 'orderItems.seller': sellerId } },
      {
        $group: {
          _id: '$_id',
          isPaid: { $first: '$isPaid' },
          isDelivered: { $first: '$isDelivered' },
          paidAt: { $first: '$paidAt' },
          createdAt: { $first: '$createdAt' },
        },
      },
      {
        $group: {
          _id: null,
          pendingWatchOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isPaid', true] },
                    { $eq: ['$isDelivered', false] },
                    { $lte: ['$paidAt', overdue3] },
                    { $gt: ['$paidAt', overdue7] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdueDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isPaid', true] },
                    { $eq: ['$isDelivered', false] },
                    { $lte: ['$paidAt', overdue7] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          highRiskOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isPaid', true] },
                    { $eq: ['$isDelivered', false] },
                    { $lte: ['$paidAt', overdue14] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          agingUnpaidOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isPaid', false] },
                    { $lte: ['$createdAt', overdue7] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Product.find({ seller: sellerId })
      .select('name category price countInStock image rating numReviews createdAt')
      .sort({ createdAt: -1 })
      .limit(8),
    Order.find({ 'orderItems.seller': sellerId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(12),
    SellerWalletTransaction.find({ seller: sellerId })
      .populate('order', '_id totalPrice isPaid isDelivered paidAt createdAt')
      .sort({ createdAt: -1 })
      .limit(12),
  ]);

  const summary = summaryAgg[0] || {
    totalOrders: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    deliveredOrdersCount: 0,
    unpaidOrdersCount: 0,
    sellerRevenue: 0,
    platformContribution: 0,
  };
  const riskSummary = riskAgg[0] || {
    pendingWatchOrders: 0,
    overdueDeliveries: 0,
    highRiskOrders: 0,
    agingUnpaidOrders: 0,
  };

  const recentOrders = recentOrdersRaw.map((order) => {
    let sellerRevenue = 0;
    let sellerItems = 0;
    order.orderItems.forEach((item) => {
      if (String(item.seller) === String(sellerId)) {
        sellerRevenue += Number(item.sellerRevenue || 0);
        sellerItems += Number(item.qty || 0);
      }
    });

    return {
      _id: order._id,
      user: order.user,
      isPaid: order.isPaid,
      isDelivered: order.isDelivered,
      paidAt: order.paidAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      sellerRevenue,
      sellerItems,
      totalPrice: order.totalPrice,
    };
  });

  const totalProducts = await Product.countDocuments({ seller: sellerId });
  const lowStockProducts = await Product.countDocuments({ seller: sellerId, countInStock: { $gt: 0, $lte: 5 } });
  const outOfStockProducts = await Product.countDocuments({ seller: sellerId, countInStock: { $lte: 0 } });

  return res.json({
    seller,
    summary: {
      ...summary,
      riskSummary,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      walletBalance: Number(seller.walletBalance || 0),
    },
    recentProducts,
    recentOrders,
    recentTransactions,
  });
};

// @desc    Get seller transactions for admin
// @route   GET /api/admin/sellers/:id/transactions
// @access  Private/Admin
const getSellerTransactionsForAdmin = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }

  const sellerId = new mongoose.Types.ObjectId(id);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [transactions, total] = await Promise.all([
    SellerWalletTransaction.find({ seller: sellerId })
      .populate('order', '_id totalPrice isPaid isDelivered paidAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit),
    SellerWalletTransaction.countDocuments({ seller: sellerId }),
  ]);

  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    transactions,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Get seller products for admin
// @route   GET /api/admin/sellers/:id/products
// @access  Private/Admin
const getSellerProductsForAdmin = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10, keyword = '', stock = 'all' } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }

  const sellerId = new mongoose.Types.ObjectId(id);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const filter = { seller: sellerId };
  const trimmedKeyword = String(keyword || '').trim();
  if (trimmedKeyword) {
    const regex = new RegExp(trimmedKeyword, 'i');
    filter.$or = [{ name: regex }, { category: regex }, { brand: regex }];
  }

  if (stock === 'out') {
    filter.countInStock = { $lte: 0 };
  } else if (stock === 'low') {
    filter.countInStock = { $gt: 0, $lte: 5 };
  } else if (stock === 'in') {
    filter.countInStock = { $gt: 0 };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select('name category brand price countInStock image rating numReviews createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit),
    Product.countDocuments(filter),
  ]);

  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    products,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
    hasPrevPage: normalizedPage > 1,
    hasNextPage: normalizedPage < pages,
  });
};

// @desc    Get seller orders for admin
// @route   GET /api/admin/sellers/:id/orders
// @access  Private/Admin
const getSellerOrdersForAdmin = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10, keyword = '', status = 'all', risk = 'all' } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid seller id' });
  }

  const sellerId = new mongoose.Types.ObjectId(id);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const trimmedKeyword = String(keyword || '').trim();
  const now = new Date();
  const overdue3 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const overdue7 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
  const overdue14 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);

  const pipeline = [
    { $unwind: '$orderItems' },
    { $match: { 'orderItems.seller': sellerId } },
    {
      $group: {
        _id: '$_id',
        user: { $first: '$user' },
        isPaid: { $first: '$isPaid' },
        isDelivered: { $first: '$isDelivered' },
        paidAt: { $first: '$paidAt' },
        deliveredAt: { $first: '$deliveredAt' },
        createdAt: { $first: '$createdAt' },
        totalPrice: { $first: '$totalPrice' },
        sellerRevenue: { $sum: { $ifNull: ['$orderItems.sellerRevenue', 0] } },
        sellerItems: { $sum: { $ifNull: ['$orderItems.qty', 0] } },
      },
    },
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
  ];

  if (status === 'paid') {
    pipeline.push({ $match: { isPaid: true } });
  } else if (status === 'unpaid') {
    pipeline.push({ $match: { isPaid: false } });
  } else if (status === 'pendingDelivery') {
    pipeline.push({ $match: { isPaid: true, isDelivered: false } });
  } else if (status === 'delivered') {
    pipeline.push({ $match: { isDelivered: true } });
  }

  if (risk === 'watch') {
    pipeline.push({
      $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue3, $gt: overdue7 } },
    });
  } else if (risk === 'overdue') {
    pipeline.push({
      $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue7 } },
    });
  } else if (risk === 'high') {
    pipeline.push({
      $match: { isPaid: true, isDelivered: false, paidAt: { $lte: overdue14 } },
    });
  } else if (risk === 'unpaidAging') {
    pipeline.push({
      $match: { isPaid: false, createdAt: { $lte: overdue7 } },
    });
  }

  if (trimmedKeyword) {
    const regex = new RegExp(trimmedKeyword, 'i');
    pipeline.push({
      $match: {
        $or: [{ orderIdStr: regex }, { buyerName: regex }, { buyerEmail: regex }],
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

module.exports = {
  getSellersForAdmin,
  exportSellersForAdmin,
  getSellerDetailsForAdmin,
  getSellerTransactionsForAdmin,
  getSellerProductsForAdmin,
  getSellerOrdersForAdmin,
  addSellerAdminNote,
  getSellerActivityForAdmin,
  updateSellerStatusByAdmin,
};
