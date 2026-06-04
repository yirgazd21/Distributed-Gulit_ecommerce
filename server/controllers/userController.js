const User = require('../models/userModel');
const Product = require('../models/productModel');

// @desc    Add product to user favorites
// @route   POST /api/users/favorites
// @access  Private
const addToFavorites = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if already in favorites
    const existingFavorite = req.user.favorites.find(
      fav => fav.product.toString() === productId
    );

    if (existingFavorite) {
      return res.status(400).json({ message: 'Product already in favorites' });
    }

    // Add to favorites
    req.user.favorites.push({
      product: productId,
      addedAt: new Date()
    });

    await req.user.save();

    res.status(201).json({
      message: 'Product added to favorites',
      favorites: req.user.favorites
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove product from user favorites
// @route   DELETE /api/users/favorites/:productId
// @access  Private
const removeFromFavorites = async (req, res) => {
  try {
    const { productId } = req.params;

    // Remove from favorites
    req.user.favorites = req.user.favorites.filter(
      fav => fav.product.toString() !== productId
    );

    await req.user.save();

    res.json({
      message: 'Product removed from favorites',
      favorites: req.user.favorites
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user favorites
// @route   GET /api/users/favorites
// @access  Private
const getUserFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites.product',
        select: 'name image price category'
      })
      .select('favorites');

    // Filter out entries where the product was deleted from the DB
    const favorites = user.favorites
      .filter(fav => fav.product != null)
      .map(fav => ({
        id: fav.product._id,
        name: fav.product.name,
        image: fav.product.image,
        price: fav.product.price,
        category: fav.product.category,
        date: fav.addedAt
      }));

    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add product to browse history
// @route   POST /api/users/browse-history
// @access  Private
const addToBrowseHistory = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove existing entry if it exists (to move to front)
    req.user.browseHistory = req.user.browseHistory.filter(
      history => history.product.toString() !== productId
    );

    // Add to beginning of history (most recent first)
    req.user.browseHistory.unshift({
      product: productId,
      viewedAt: new Date()
    });

    // Keep only last 50 items for commit
    if (req.user.browseHistory.length > 50) {
      req.user.browseHistory = req.user.browseHistory.slice(0, 50);
    }

    await req.user.save();

    res.status(201).json({
      message: 'Product added to browse history',
      browseHistory: req.user.browseHistory
    });
  } catch (error) {
    console.error('Add to browse history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user browse history
// @route   GET /api/users/browse-history
// @access  Private
const getUserBrowseHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'browseHistory.product',
        select: 'name image price category'
      })
      .select('browseHistory');

    // Filter out entries where the product was deleted from the DB
    const browseHistory = user.browseHistory
      .filter(history => history.product != null)
      .map(history => ({
        id: history.product._id,
        name: history.product.name,
        image: history.product.image,
        price: history.product.price,
        category: history.product.category,
        date: history.viewedAt
      }));

    res.json(browseHistory);
  } catch (error) {
    console.error('Get browse history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove product from browse history
// @route   DELETE /api/users/browse-history/:productId
// @access  Private
const removeFromBrowseHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    // Remove from browse history
    req.user.browseHistory = req.user.browseHistory.filter(
      history => history.product.toString() !== productId
    );

    await req.user.save();

    res.json({
      message: 'Product removed from browse history',
      browseHistory: req.user.browseHistory
    });
  } catch (error) {
    console.error('Remove from browse history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  addToBrowseHistory,
  getUserBrowseHistory,
  removeFromBrowseHistory
};