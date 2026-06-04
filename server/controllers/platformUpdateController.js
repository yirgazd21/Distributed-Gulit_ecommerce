const PlatformUpdate = require('../models/platformUpdateModel');

// @desc    Get active platform updates for buyer/seller interfaces
// @route   GET /api/platform/updates?audience=buyer|seller
// @access  Public
const getActivePlatformUpdates = async (req, res) => {
  const audience = String(req.query.audience || '').toLowerCase();
  if (!['buyer', 'seller'].includes(audience)) {
    return res.status(400).json({ message: 'Audience must be buyer or seller' });
  }

  const now = new Date();

  const updates = await PlatformUpdate.find({
    audience,
    isActive: true,
    startAt: { $lte: now },
    $or: [{ endAt: null }, { endAt: { $gte: now } }],
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(5)
    .select('title message audience priority startAt endAt createdAt');

  return res.json({ updates });
};

module.exports = {
  getActivePlatformUpdates,
};
