const mongoose = require('mongoose');

// 1. Review Schema (Ensure it looks exactly like this)
const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// 2. Main Product Schema
const productSchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // The seller
    },
    name: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        required: true 
    }, // Main Image
    // 👇 NEW: Array of additional images for the slideshow
    images: 
      { type: [String] } 
    , 
    brand: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: false 
    },
    subcategory: {
        type: String,
        required: true
    },
    description: { 
        type: String, 
        required: true 
    },
    
    // 👇 NEW: Original Price to calculate the Discount %
    originalPrice: { 
      type: Number, 
      required: false, 
      default: 0 
    },
    price: { 
        type: Number, 
        required: true 
    }, // Current selling price
    
    countInStock: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    
    reviews: [reviewSchema], // Embedded reviews array
    rating: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    numReviews: { 
        type: Number, 
        required: true, 
        default: 0 
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
