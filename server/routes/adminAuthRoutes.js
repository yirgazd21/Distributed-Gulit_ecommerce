const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');

const authLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many attempts. Please try again in {remaining}.'
});

const {
  adminLogin,
  adminForgotPassword,
  adminResetPassword,
  adminGoogleLogin,
  getAdminProfile,
  getAdminStats,
} = require('../controllers/adminAuthController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', authLimiter, adminLogin);
router.post('/forgot-password', adminForgotPassword);
router.post('/reset-password/:token', adminResetPassword);
router.post('/google', authLimiter, adminGoogleLogin);
router.get('/me', protect, admin, getAdminProfile);
router.get('/stats', protect, admin, getAdminStats);

module.exports = router;
