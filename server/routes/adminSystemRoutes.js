const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const {
  getPlatformUpdatesForAdmin,
  createPlatformUpdateByAdmin,
  updatePlatformUpdateByAdmin,
} = require('../controllers/adminSystemController');

router.get('/updates', protect, admin, getPlatformUpdatesForAdmin);
router.post('/updates', protect, admin, createPlatformUpdateByAdmin);
router.patch('/updates/:id', protect, admin, updatePlatformUpdateByAdmin);

module.exports = router;
