const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');
const { getUsersForAdmin, updateUserRoleByAdmin } = require('../controllers/adminUserController');

router.get('/', protect, admin, getUsersForAdmin);
router.patch('/:id/role', protect, admin, updateUserRoleByAdmin);

module.exports = router;
