const User = require('../models/userModel');
const Product = require('../models/productModel');

// Helper: recalculate totals server-side (mirrors cartUtils.js)
const calcTotals = (cartItems) => {
  const itemsPrice = cartItems.reduce((acc, item) => acc + Number(item.price) * Number(item.qty), 0);
  const shippingPrice = itemsPrice > 1000 ? 0 : 50;
  const taxPrice = Number((0.15 * itemsPrice).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));
  return {
    itemsPrice: Number(itemsPrice.toFixed(2)),
    shippingPrice,
    taxPrice,
    totalPrice,
  };
};

// @desc    Get logged-in user's cart
// @route   GET /api/users/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('cart');
    const cartItems = user.cart || [];
    res.json({ cartItems, ...calcTotals(cartItems) });
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add or update an item in the cart
// @route   POST /api/users/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, qty, selectedImage, cartItemId } = req.body;

    if (!productId) return res.status(400).json({ message: 'Product ID is required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.countInStock < 1) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }

    const requestedQty = Number(qty) || 1;
    if (requestedQty > product.countInStock) {
      return res.status(400).json({ message: `Only ${product.countInStock} in stock` });
    }

    const user = await User.findById(req.user._id);
    const resolvedCartItemId = cartItemId || `${productId}-${selectedImage || product.image}`;

    const existingIndex = user.cart.findIndex(
      (item) => item.cartItemId === resolvedCartItemId
    );

    if (existingIndex >= 0) {
      // Update quantity
      user.cart[existingIndex].qty = requestedQty;
    } else {
      // Add new item
      user.cart.push({
        product: productId,
        name: product.name,
        image: selectedImage || product.image,
        price: product.price,
        originalPrice: product.originalPrice || 0,
        qty: requestedQty,
        countInStock: product.countInStock,
        seller: product.seller,
        selectedImage: selectedImage || product.image,
        cartItemId: resolvedCartItemId,
        addedAt: new Date(),
      });
    }

    await user.save();

    const cartItems = user.cart;
    res.json({ cartItems, ...calcTotals(cartItems) });
  } catch (error) {
    console.error('addToCart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove an item from the cart
// @route   DELETE /api/users/cart/:cartItemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const user = await User.findById(req.user._id);

    user.cart = user.cart.filter(
      (item) =>
        item.cartItemId !== cartItemId &&
        item._id.toString() !== cartItemId &&
        item.product.toString() !== cartItemId
    );

    await user.save();

    const cartItems = user.cart;
    res.json({ cartItems, ...calcTotals(cartItems) });
  } catch (error) {
    console.error('removeFromCart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear the entire cart
// @route   DELETE /api/users/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });
    res.json({ cartItems: [], itemsPrice: 0, shippingPrice: 0, taxPrice: 0, totalPrice: 0 });
  } catch (error) {
    console.error('clearCart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Replace entire cart (used on login to merge/restore)
// @route   PUT /api/users/cart
// @access  Private
const syncCart = async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ message: 'cartItems must be an array' });
    }

    // Validate each item has required fields
    const validItems = cartItems.filter(
      (item) => item.product || item._id
    ).map((item) => ({
      product: item.product || item._id,
      name: item.name,
      image: item.image,
      price: item.price,
      originalPrice: item.originalPrice || 0,
      qty: Number(item.qty) || 1,
      countInStock: item.countInStock || 0,
      seller: item.seller,
      selectedImage: item.selectedImage || item.image,
      cartItemId: item.cartItemId || `${item.product || item._id}-${item.selectedImage || item.image}`,
      addedAt: item.addedAt || new Date(),
    }));

    await User.findByIdAndUpdate(req.user._id, { $set: { cart: validItems } });

    res.json({ cartItems: validItems, ...calcTotals(validItems) });
  } catch (error) {
    console.error('syncCart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getCart, addToCart, removeFromCart, clearCart, syncCart };
