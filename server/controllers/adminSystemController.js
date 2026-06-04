const mongoose = require('mongoose');
const PlatformUpdate = require('../models/platformUpdateModel');

// @desc    Get platform updates for admin management
// @route   GET /api/admin/system/updates
// @access  Private/Admin
const getPlatformUpdatesForAdmin = async (req, res) => {
  const { audience = 'all', status = 'all', page = 1, limit = 20 } = req.query;

  const filter = {};
  if (audience !== 'all') filter.audience = audience;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [updates, total] = await Promise.all([
    PlatformUpdate.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit),
    PlatformUpdate.countDocuments(filter),
  ]);

  const pages = Math.max(Math.ceil(total / normalizedLimit), 1);

  return res.json({
    updates,
    page: normalizedPage,
    pages,
    total,
    limit: normalizedLimit,
  });
};

// @desc    Create platform update
// @route   POST /api/admin/system/updates
// @access  Private/Admin
const createPlatformUpdateByAdmin = async (req, res) => {
  const { title = '', message = '', audience = '', priority = 'medium', startAt, endAt, isActive = true } = req.body;

  if (!String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!String(message).trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }
  if (!['buyer', 'seller'].includes(String(audience))) {
    return res.status(400).json({ message: 'Audience must be buyer or seller' });
  }

  const normalizedPriority = ['low', 'medium', 'high'].includes(String(priority)) ? String(priority) : 'medium';
  const parsedStartAt = startAt ? new Date(startAt) : new Date();
  if (Number.isNaN(parsedStartAt.getTime())) {
    return res.status(400).json({ message: 'Invalid start date/time' });
  }
  const parsedEndAt = endAt ? new Date(endAt) : null;
  if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
    return res.status(400).json({ message: 'Invalid end date/time' });
  }
  if (parsedEndAt && parsedEndAt <= parsedStartAt) {
    return res.status(400).json({ message: 'End date/time must be after start date/time' });
  }

  const update = await PlatformUpdate.create({
    title: String(title).trim(),
    message: String(message).trim(),
    audience: String(audience),
    priority: normalizedPriority,
    isActive: Boolean(isActive),
    startAt: parsedStartAt,
    endAt: parsedEndAt,
    createdBy: req.user._id,
  });

  return res.status(201).json({ message: 'Platform update created', updateId: update._id });
};

// @desc    Update platform update
// @route   PATCH /api/admin/system/updates/:id
// @access  Private/Admin
const updatePlatformUpdateByAdmin = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid update id' });
  }

  const update = await PlatformUpdate.findById(id);
  if (!update) {
    return res.status(404).json({ message: 'Platform update not found' });
  }

  const { title, message, audience, priority, isActive, startAt, endAt } = req.body;

  if (title !== undefined) update.title = String(title).trim();
  if (message !== undefined) update.message = String(message).trim();
  if (audience !== undefined && ['buyer', 'seller'].includes(String(audience))) update.audience = String(audience);
  if (priority !== undefined && ['low', 'medium', 'high'].includes(String(priority))) update.priority = String(priority);
  if (isActive !== undefined) update.isActive = Boolean(isActive);
  if (startAt !== undefined) {
    const parsedStartAt = startAt ? new Date(startAt) : update.startAt;
    if (Number.isNaN(parsedStartAt.getTime())) {
      return res.status(400).json({ message: 'Invalid start date/time' });
    }
    update.startAt = parsedStartAt;
  }
  if (endAt !== undefined) {
    const parsedEndAt = endAt ? new Date(endAt) : null;
    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
      return res.status(400).json({ message: 'Invalid end date/time' });
    }
    update.endAt = parsedEndAt;
  }
  if (update.endAt && update.endAt <= update.startAt) {
    return res.status(400).json({ message: 'End date/time must be after start date/time' });
  }

  await update.save();
  return res.json({ message: 'Platform update saved', updateId: update._id, isActive: update.isActive });
};

module.exports = {
  getPlatformUpdatesForAdmin,
  createPlatformUpdateByAdmin,
  updatePlatformUpdateByAdmin,
};
