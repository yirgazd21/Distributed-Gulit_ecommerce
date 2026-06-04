const express = require('express');
const router = express.Router();
const { initializeChapaPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/payments/chapa/init
// @desc    Initialize Chapa payment
// @access  Private
router.post('/chapa/init', protect, initializeChapaPayment);

module.exports = router;