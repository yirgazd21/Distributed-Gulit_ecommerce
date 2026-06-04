const express = require('express');
const router = express.Router();
const {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getCategories);
router.get('/admin', protect, admin, getAdminCategories);
router.post('/admin', protect, admin, createCategory);
router.patch('/admin/:id', protect, admin, updateCategory);

module.exports = router;
