const mongoose = require('mongoose');
const SupportThread = require('../models/supportThreadModel');

// @desc    Seller get inbox (tickets + admin direct + broadcast)
// @route   GET /api/sellers/support/inbox
// @access  Private/Seller
const getSellerSupportInbox = async (req, res) => {
  const threads = await SupportThread.find({
    $or: [{ seller: req.seller._id }, { threadType: 'broadcast' }],
  })
    .populate('messages.senderAdmin', 'name email')
    .sort({ lastMessageAt: -1 })
    .limit(120)
    .lean();

  const summary = {
    totalThreads: threads.length,
    unread: threads.filter((thread) => thread.unreadBySeller).length,
    open: threads.filter((thread) => ['open', 'in_progress'].includes(thread.status)).length,
  };

  return res.json({ summary, threads });
};

// @desc    Seller creates support ticket
// @route   POST /api/sellers/support/tickets
// @access  Private/Seller
const createSellerSupportTicket = async (req, res) => {
  const { subject = '', message = '', category = 'General', priority = 'medium' } = req.body;

  if (!String(subject).trim()) {
    return res.status(400).json({ message: 'Subject is required' });
  }
  if (!String(message).trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const normalizedPriority = ['low', 'medium', 'high'].includes(String(priority))
    ? String(priority)
    : 'medium';

  const thread = await SupportThread.create({
    seller: req.seller._id,
    threadType: 'ticket',
    subject: String(subject).trim(),
    category: String(category || 'General').trim(),
    status: 'open',
    priority: normalizedPriority,
    unreadBySeller: false,
    unreadByAdmin: true,
    lastMessageAt: new Date(),
    messages: [
      {
        senderType: 'seller',
        senderSeller: req.seller._id,
        body: String(message).trim(),
        createdAt: new Date(),
      },
    ],
  });

  return res.status(201).json({ message: 'Support ticket created', threadId: thread._id });
};

// @desc    Seller reply to own support thread
// @route   POST /api/sellers/support/threads/:id/reply
// @access  Private/Seller
const replySellerSupportThread = async (req, res) => {
  const { id } = req.params;
  const { message = '' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid thread id' });
  }
  if (!String(message).trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const thread = await SupportThread.findById(id);
  if (!thread) {
    return res.status(404).json({ message: 'Support thread not found' });
  }

  if (!thread.seller || thread.seller.toString() !== req.seller._id.toString()) {
    return res.status(403).json({ message: 'Not authorized for this thread' });
  }

  thread.messages.push({
    senderType: 'seller',
    senderSeller: req.seller._id,
    body: String(message).trim(),
    createdAt: new Date(),
  });

  thread.unreadByAdmin = true;
  thread.unreadBySeller = false;
  thread.lastMessageAt = new Date();

  if (thread.status === 'resolved' || thread.status === 'closed') {
    thread.status = 'in_progress';
  }

  await thread.save();
  return res.json({ message: 'Reply sent', threadId: thread._id });
};

// @desc    Seller mark thread as read
// @route   PATCH /api/sellers/support/threads/:threadId/read
// @access  Private/Seller
const markSellerSupportThreadRead = async (req, res) => {
  const { threadId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(threadId)) {
    return res.status(400).json({ message: 'Invalid thread id' });
  }

  const thread = await SupportThread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ message: 'Support thread not found' });
  }

  const isRecipient =
    thread.threadType === 'broadcast' ||
    (thread.seller && thread.seller.toString() === req.seller._id.toString());

  if (!isRecipient) {
    return res.status(403).json({ message: 'Not authorized for this thread' });
  }

  thread.unreadBySeller = false;
  await thread.save();

  return res.json({ message: 'Thread marked as read', threadId: thread._id });
};

module.exports = {
  getSellerSupportInbox,
  createSellerSupportTicket,
  replySellerSupportThread,
  markSellerSupportThreadRead,
};