const express = require('express');
const router = express.Router();

const {
  registerSeller,
  authSeller,
  googleLoginSeller,
  googleIdentitySeller,
  forgotSellerPassword,
  resetSellerPassword,
  logoutSeller,
  getSellerWallet,
} = require('../controllers/sellerController');
const { getSellerSettings, updateSellerSettings } = require('../controllers/sellerSettingsController');
const {
  getSellerSupportInbox,
  createSellerSupportTicket,
  replySellerSupportThread,
  markSellerSupportThreadRead,
} = require('../controllers/sellerSupportController');
const { uploadSellerDocs } = require('../middleware/uploadMiddleware');
// 👇 1. Import the new controller and the protect middleware
const { getSellerOrders, getSellerOrderById, updateOrderToDelivered, updateSellerOrderStatus, completeOrderRefund, rejectOrderRefund } = require('../controllers/sellerOrderController');
const { protectSeller } = require('../middleware/authMiddleware');

router.post('/', uploadSellerDocs, registerSeller);
router.post('/login', authSeller);
router.post('/google/login', googleLoginSeller);
router.post('/google/identity', googleIdentitySeller);
router.post('/forgot-password', forgotSellerPassword);
router.post('/reset-password/:token', resetSellerPassword);
router.post('/logout', logoutSeller);
router.get('/wallet', protectSeller, getSellerWallet);
router.route('/settings').get(protectSeller, getSellerSettings).put(protectSeller, updateSellerSettings);

// 👇 2. Add the secure orders route
router.route('/orders').get(protectSeller, getSellerOrders);
router.route('/orders/:id').get(protectSeller, getSellerOrderById);
router.route('/orders/:id/deliver').put(protectSeller, updateOrderToDelivered);
router.route('/orders/:id/status').put(protectSeller, updateSellerOrderStatus);
router.route('/orders/:id/refund/complete').put(protectSeller, completeOrderRefund);
router.route('/orders/:id/refund/reject').put(protectSeller, rejectOrderRefund);
router.get('/support/inbox', protectSeller, getSellerSupportInbox);
router.post('/support/tickets', protectSeller, createSellerSupportTicket);
router.post('/support/threads/:id/reply', protectSeller, replySellerSupportThread);
router.patch('/support/threads/:id/read', protectSeller, markSellerSupportThreadRead);

module.exports = router;
