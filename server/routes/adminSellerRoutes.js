const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const {
  getSellersForAdmin,
  exportSellersForAdmin,
  getSellerDetailsForAdmin,
  getSellerTransactionsForAdmin,
  getSellerProductsForAdmin,
  getSellerOrdersForAdmin,
  addSellerAdminNote,
  getSellerActivityForAdmin,
  updateSellerStatusByAdmin,
} = require('../controllers/adminSellerController');

router.get('/', protect, admin, getSellersForAdmin);
router.get('/export', protect, admin, exportSellersForAdmin);
router.get('/:id/transactions', protect, admin, getSellerTransactionsForAdmin);
router.get('/:id/products', protect, admin, getSellerProductsForAdmin);
router.get('/:id/orders', protect, admin, getSellerOrdersForAdmin);
router.get('/:id/activity', protect, admin, getSellerActivityForAdmin);
router.post('/:id/notes', protect, admin, addSellerAdminNote);
router.patch('/:id/status', protect, admin, updateSellerStatusByAdmin);
router.get('/:id', protect, admin, getSellerDetailsForAdmin);

module.exports = router;
