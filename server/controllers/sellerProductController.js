const Product = require('../models/productModel');
const { validateProductCategory } = require('./categoryController');

// @desc    Get all products for the logged-in seller
// @route   GET /api/sellers/products
// @access  Private/Seller
const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.seller._id });
    // Add isOutOfStock flag for each product
    const productsWithStockFlag = products.map(product => ({
      ...product.toObject(),
      isOutOfStock: product.countInStock === 0
    }));
    res.json(productsWithStockFlag);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new product
// @route   POST /api/sellers/products
// @access  Private/Seller
const createSellerProduct = async (req, res) => {
  try {
    const { name, price, originalPrice, description, image, images, brand, category, subcategory, countInStock } = req.body;
    const categoryCheck = await validateProductCategory(category, subcategory);
    if (!categoryCheck.valid) {
      return res.status(400).json({ message: categoryCheck.message });
    }

    const product = new Product({
      name,
      price,
      originalPrice: originalPrice || 0,
      user: req.seller._id, 
      seller: req.seller._id, 
      image,
      images: images || [],
      brand,
      category: categoryCheck.category,
      subcategory: categoryCheck.subcategory,
      countInStock,
      numReviews: 0,
      description,
    });

    const createdProduct = await product.save();

    // Notify all connected clients that a product was added
    if (req.io) req.io.emit('peer-product-added', { operationType: 'insert' });

    res.status(201).json({
      ...createdProduct.toObject(),
      isOutOfStock: createdProduct.countInStock === 0
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create product', error: error.message });
  }
};

// @desc    Update an existing product
// @route   PUT /api/sellers/products/:id
// @access  Private/Seller
const updateSellerProduct = async (req, res) => {
  try {
    const { name, price, originalPrice, description, image, images, brand, category, subcategory, countInStock } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      if (product.seller.toString() !== req.seller._id.toString()) {
        return res.status(403).json({ message: 'You do not have permission to edit this product' });
      }

      product.name = name || product.name;
      product.price = price || product.price;
      product.originalPrice = originalPrice !== undefined ? originalPrice : product.originalPrice;
      product.description = description || product.description;
      product.image = image || product.image;
      product.images = images || product.images;
      product.brand = brand || product.brand;
      if (category !== undefined || subcategory !== undefined) {
        const categoryCheck = await validateProductCategory(category || product.category, subcategory || product.subcategory);
        if (!categoryCheck.valid) {
          return res.status(400).json({ message: categoryCheck.message });
        }
        product.category = categoryCheck.category;
        product.subcategory = categoryCheck.subcategory;
      }
      product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;

      const updatedProduct = await product.save();

      // Notify all connected clients that a product was updated
      if (req.io) req.io.emit('peer-product-added', { operationType: 'update' });

      res.json({
        ...updatedProduct.toObject(),
        isOutOfStock: updatedProduct.countInStock === 0
      });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Failed to update product', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/sellers/products/:id
// @access  Private/Seller
const deleteSellerProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (product.seller.toString() !== req.seller._id.toString()) {
        return res.status(403).json({ message: 'You do not have permission to delete this product' });
      }

      await product.deleteOne();

      // Notify all connected clients that a product was removed
      if (req.io) req.io.emit('peer-product-added', { operationType: 'delete' });

      res.json({ message: 'Product removed successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

module.exports = {
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
};