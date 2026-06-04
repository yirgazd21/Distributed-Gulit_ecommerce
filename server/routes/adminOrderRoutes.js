const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const { getOrdersForAdmin, updateOrderDisputeByAdmin } = require('../controllers/adminOrderController');

router.get('/', protect, admin, getOrdersForAdmin);
router.patch('/:id/dispute', protect, admin, updateOrderDisputeByAdmin);

module.exports = router;
