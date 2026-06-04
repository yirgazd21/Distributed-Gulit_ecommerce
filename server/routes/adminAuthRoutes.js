const express = require('express');
const router = express.Router();

const {
  adminLogin,
  adminForgotPassword,
  adminResetPassword,
  adminGoogleLogin,
  getAdminProfile,
  getAdminStats,
} = require('../controllers/adminAuthController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', adminLogin);
router.post('/forgot-password', adminForgotPassword);
router.post('/reset-password/:token', adminResetPassword);
router.post('/google', adminGoogleLogin);
router.get('/me', protect, admin, getAdminProfile);
router.get('/stats', protect, admin, getAdminStats);

module.exports = router;
