const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const {
  getAdminSupportInbox,
  replySupportThreadByAdmin,
  updateSupportThreadStatusByAdmin,
  sendSupportMessageByAdmin,
} = require('../controllers/adminSupportController');

router.get('/', protect, admin, getAdminSupportInbox);
router.post('/messages', protect, admin, sendSupportMessageByAdmin);
router.post('/threads/:id/reply', protect, admin, replySupportThreadByAdmin);
router.patch('/threads/:id/status', protect, admin, updateSupportThreadStatusByAdmin);

module.exports = router;
