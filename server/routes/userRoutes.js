const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleAuthUser,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    logoutUser,
    updateUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    addToBrowseHistory,
    getUserBrowseHistory,
    removeFromBrowseHistory
} = require('../controllers/userController');
const {
    getCart,
    addToCart,
    removeFromCart,
    clearCart,
    syncCart,
} = require('../controllers/cartController');


// Define the paths
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuthUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', logoutUser);

// 🔒 Protected Route (Test)
router.get('/profile', protect, (req, res) => {
    res.json(req.user); // Should return Abebe's info if token is valid
});


router.route('/profile')
    .get(protect, (req, res) => res.json(req.user)) // GET: View Profile
    .put(protect, updateUserProfile);

// Favorites routes
router.route('/favorites')
    .get(protect, getUserFavorites)
    .post(protect, addToFavorites);

router.route('/favorites/:productId')
    .delete(protect, removeFromFavorites);

// Browse history routes
router.route('/browse-history')
    .get(protect, getUserBrowseHistory)
    .post(protect, addToBrowseHistory);

router.route('/browse-history/:productId')
    .delete(protect, removeFromBrowseHistory);

// Cart routes
router.route('/cart')
    .get(protect, getCart)
    .post(protect, addToCart)
    .put(protect, syncCart)
    .delete(protect, clearCart);

router.route('/cart/:cartItemId')
    .delete(protect, removeFromCart);


module.exports = router;
