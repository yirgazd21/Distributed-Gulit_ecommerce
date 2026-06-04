const Product = require('../models/productModel');
const Order = require('../models/orderModel');

const CATEGORY_ALIASES = {
  all: '',
  electronics: 'Electronics',
  clothes: 'Clothing',
  clothing: 'Clothing',
  fashion: 'Clothing',
  'home utility': 'Home & Kitchen',
  'home & kitchen': 'Home & Kitchen',
  'home and kitchen': 'Home & Kitchen',
  books: 'Books',
  beauty: 'Beauty',
  agriculture: 'Other',
  handicrafts: 'Other',
  other: 'Other',
};

// Safely escape special regex characters in user-supplied strings
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeCategory = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return CATEGORY_ALIASES[normalizedValue] || String(value || '').trim();
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    // 1. Keyword search filter
    const keyword = req.query.keyword
      ? { name: { $regex: req.query.keyword, $options: 'i' } }
      : {};

    // 2. Category / subcategory filters
    const selectedCategory = normalizeCategory(req.query.category);
    const selectedSubcategory = normalizeCategory(req.query.subcategory);

    const categoryFilter = selectedCategory
      ? { category: { $regex: '^' + escapeRegex(selectedCategory), $options: 'i' } }
      : {};

    const subcategoryFilter = selectedSubcategory
      ? { subcategory: { $regex: '^' + escapeRegex(selectedSubcategory), $options: 'i' } }
      : {};

    // 3. Query — only return products that have stock available
    const products = await Product.find({
      ...keyword,
      ...categoryFilter,
      ...subcategoryFilter,
      countInStock: { $gt: 0 },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a product (legacy route — seller products use sellerProductController)
// @route   POST /api/products
// @access  Private/Seller
const createProduct = async (req, res) => {
  try {
    const { name, price, description, image, brand, category, countInStock } = req.body;

    const product = new Product({
      name,
      price,
      user: req.user._id,
      seller: req.user._id,
      image,
      brand,
      category,
      countInStock,
      numReviews: 0,
      description,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Product creation failed' });
  }
};

// @desc    Create a product review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if bought and delivered
    const hasBoughtAndDelivered = await Order.findOne({
      user: req.user._id,
      isDelivered: true,
      'orderItems.product': product._id,
    });
    if (!hasBoughtAndDelivered) {
      return res.status(400).json({
        message: 'You can only review products after they have been delivered to you.',
      });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  createProductReview,
};
