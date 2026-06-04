const express = require('express');
const router = express.Router();
const { 
    getProducts, 
    getProductById, 
    createProductReview
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware'); 

// =======================================
// 🛍️ PUBLIC BUYER ROUTES
// =======================================

// Fetch all products for the homepage/search
router.get('/', getProducts);

// Fetch a single product for the Product Details page
router.get('/:id', getProductById);


// =======================================
// 🔒 PROTECTED BUYER ROUTES
// =======================================

// Create a review functionality for buyers after they receive ordered item.
router.route('/:id/reviews').post(protect, createProductReview);


// Note: Seller product creation (POST /) was moved to server/routes/sellerProductRoutes.js!

module.exports = router;