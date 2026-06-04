const mongoose = require('mongoose');
const SupportThread = require('../models/supportThreadModel');
const Seller = require('../models/sellerModel');

const normalize = (value) => String(value || '').trim().toLowerCase();

// @desc    Get admin support inbox
// @route   GET /api/admin/support
// @access  Private/Admin
const getAdminSupportInbox = async (req, res) => {
  const { page = 1, limit = 12, keyword = '', status = 'all', type = 'all' } = req.query;

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const keywordText = normalize(keyword);

  const pipeline = [
    {
      $lookup: {
        from: 'sellers',
        localField: 'seller',
        foreignField: '_id',
        as: 'sellerDoc',
      },
    },
    {
      $unwind: {
        path: '$sellerDoc',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        sellerName: '$sellerDoc.shopName',
        sellerEmail: '$sellerDoc.email',
        threadIdStr: { $toString: '$_id' },
        lastMessage: { $arrayElemAt: ['$messages', -1] },
      },
    },
  ];

  if (status !== 'all') {
    pipeline.push({ $match: { status } });
  }
  if (type !== 'all') {
    pipeline.push({ $match: { threadType: type } });
  }
  if (keywordText) {
    const regex = new RegExp(keywordText, 'i');
    pipeline.push({
      $match: {
        $or: [{ threadIdStr: regex }, { subject: regex }, { sellerName: regex }, { sellerEmail: regex }, { 'lastMessage.body': regex }],
      },
    });
  }

  pipeline.push({ $sort: { lastMessageAt: -1 } });
  pipeline.push({
    $facet: {
      threads: [{ $skip: skip }, { $limit: normalizedLimit }],
      metadata: [{ $count: 'total' }],
    },
  });

  const [result] = await SupportThread.aggregate(pipeline);
  const threads = result?.threads || [];
  const total = result?.metadata?.[0]?.total || 0;
  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  const summaryAgg = await SupportThread.aggregate([
    {
      $group: {
        _id: null,
        totalThreads: { $sum: 1 },
        unreadForAdmin: { $sum: { $cond: [{ $eq: ['$unreadByAdmin', true] }, 1, 0] } },
        openThreads: { $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] } },
        ticketThreads: { $sum: { $cond: [{ $eq: ['$threadType', 'ticket'] }, 1, 0] } },
      },
    },
  ]);
  const summary = summaryAgg[0] || { totalThreads: 0, unreadForAdmin: 0, openThreads: 0, ticketThreads: 0 };

  return res.json({
    summary,
    threads,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
  });
};

// @desc    Admin reply to support thread
// @route   POST /api/admin/support/threads/:id/reply
// @access  Private/Admin
const replySupportThreadByAdmin = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid thread id' });
  }
  if (!String(message || '').trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const thread = await SupportThread.findById(id);
  if (!thread) {
    return res.status(404).json({ message: 'Support thread not found' });
  }

  thread.messages.push({
    senderType: 'admin',
    senderAdmin: req.user._id,
    body: String(message).trim(),
    createdAt: new Date(),
  });
  thread.unreadBySeller = thread.threadType !== 'broadcast';
  thread.unreadByAdmin = false;
  thread.lastMessageAt = new Date();

  if (thread.status === 'open') {
    thread.status = 'in_progress';
  }

  await thread.save();
  return res.json({ message: 'Reply sent', threadId: thread._id });
};

// @desc    Update support thread status by admin
// @route   PATCH /api/admin/support/threads/:id/status
// @access  Private/Admin
const updateSupportThreadStatusByAdmin = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid thread id' });
  }

  const allowed = ['open', 'in_progress', 'resolved', 'closed'];
  if (!allowed.includes(String(status))) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const thread = await SupportThread.findById(id);
  if (!thread) {
    return res.status(404).json({ message: 'Support thread not found' });
  }

  thread.status = status;
  await thread.save();
  return res.json({ message: 'Thread status updated', threadId: thread._id, status: thread.status });
};

// @desc    Admin send message (broadcast or specific seller)
// @route   POST /api/admin/support/messages
// @access  Private/Admin
const sendSupportMessageByAdmin = async (req, res) => {
  const { mode = 'seller', sellerId = '', subject = '', message = '', priority = 'medium' } = req.body;

  if (!String(subject || '').trim()) {
    return res.status(400).json({ message: 'Subject is required' });
  }
  if (!String(message || '').trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const normalizedPriority = ['low', 'medium', 'high'].includes(String(priority)) ? String(priority) : 'medium';

  if (mode === 'broadcast') {
    const thread = await SupportThread.create({
      seller: null,
      threadType: 'broadcast',
      subject: String(subject).trim(),
      category: 'Announcement',
      status: 'open',
      priority: normalizedPriority,
      unreadBySeller: true,
      unreadByAdmin: false,
      lastMessageAt: new Date(),
      messages: [
        {
          senderType: 'admin',
          senderAdmin: req.user._id,
          body: String(message).trim(),
          createdAt: new Date(),
        },
      ],
    });
    return res.status(201).json({ message: 'Broadcast sent to all sellers', threadId: thread._id });
  }

  if (!mongoose.Types.ObjectId.isValid(String(sellerId))) {
    return res.status(400).json({ message: 'Valid seller id is required for direct message' });
  }

  const seller = await Seller.findById(sellerId).select('_id');
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const thread = await SupportThread.create({
    seller: seller._id,
    threadType: 'direct',
    subject: String(subject).trim(),
    category: 'Admin Message',
    status: 'open',
    priority: normalizedPriority,
    unreadBySeller: true,
    unreadByAdmin: false,
    lastMessageAt: new Date(),
    messages: [
      {
        senderType: 'admin',
        senderAdmin: req.user._id,
        body: String(message).trim(),
        createdAt: new Date(),
      },
    ],
  });

  return res.status(201).json({ message: 'Message sent to seller', threadId: thread._id });
};

module.exports = {
  getAdminSupportInbox,
  replySupportThreadByAdmin,
  updateSupportThreadStatusByAdmin,
  sendSupportMessageByAdmin,
};
