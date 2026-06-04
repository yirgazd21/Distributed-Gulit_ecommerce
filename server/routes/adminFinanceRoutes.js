const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const { getAdminFinanceOverview, exportAdminFinanceReport } = require('../controllers/adminFinanceController');

router.get('/', protect, admin, getAdminFinanceOverview);
router.get('/export', protect, admin, exportAdminFinanceReport);

module.exports = router;
