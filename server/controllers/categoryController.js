const Category = require('../models/categoryModel');

const DEFAULT_CATEGORIES = [
  { name: 'Electronics', subcategories: ['Mobile', 'Laptop', 'TV', 'Camera', 'Audio'] },
  { name: 'Clothing', subcategories: ['Men', 'Female', 'Kids', 'Shoes', 'Accessories'] },
  { name: 'Home & Kitchen', subcategories: ['Furniture', 'Cookware', 'Decor', 'Appliances'] },
  { name: 'Books', subcategories: ['Fiction', 'Education', 'Business', 'Children'] },
  { name: 'Beauty', subcategories: ['Skin Care', 'Hair Care', 'Makeup', 'Fragrance'] },
  { name: 'Other', subcategories: ['General', 'Tools', 'Sports', 'Toys'] },
];

const normalize = (value) => String(value || '').trim();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureDefaultCategories = async () => {
  const count = await Category.countDocuments();
  if (count > 0) return;

  await Category.insertMany(
    DEFAULT_CATEGORIES.map((category) => ({
      name: category.name,
      subcategories: category.subcategories.map((name) => ({ name })),
    }))
  );
};

const getCategories = async (req, res) => {
  await ensureDefaultCategories();
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json(categories);
};

const getAdminCategories = async (req, res) => {
  await ensureDefaultCategories();
  const categories = await Category.find({}).sort({ name: 1 });
  res.json({ categories });
};

const createCategory = async (req, res) => {
  const name = normalize(req.body.name);
  const subcategories = Array.isArray(req.body.subcategories) ? req.body.subcategories : [];

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  const exists = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (exists) {
    return res.status(400).json({ message: 'Category already exists' });
  }

  const category = await Category.create({
    name,
    subcategories: [...new Set(subcategories.map(normalize).filter(Boolean))].map((item) => ({ name: item })),
  });

  res.status(201).json(category);
};

const updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  if (req.body.name !== undefined) {
    const name = normalize(req.body.name);
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    category.name = name;
  }

  if (req.body.subcategories !== undefined) {
    const subcategories = Array.isArray(req.body.subcategories) ? req.body.subcategories : [];
    category.subcategories = [...new Set(subcategories.map(normalize).filter(Boolean))].map((item) => ({ name: item }));
  }

  if (req.body.isActive !== undefined) {
    category.isActive = Boolean(req.body.isActive);
  }

  const updated = await category.save();
  res.json(updated);
};

const validateProductCategory = async (categoryName, subcategoryName) => {
  await ensureDefaultCategories();
  const categoryNameNormalized = normalize(categoryName);
  const category = await Category.findOne({ name: new RegExp(`^${escapeRegex(categoryNameNormalized)}$`, 'i'), isActive: true });
  if (!category) return { valid: false, message: 'Choose a valid admin-approved category' };

  const subcategory = normalize(subcategoryName);
  if (!subcategory) return { valid: false, message: 'Choose a valid admin-approved subcategory' };

  const match = category.subcategories.some((item) => item.name.toLowerCase() === subcategory.toLowerCase());
  if (!match) return { valid: false, message: 'Choose a valid admin-approved subcategory' };

  return { valid: true, category: category.name, subcategory: category.subcategories.find((item) => item.name.toLowerCase() === subcategory.toLowerCase()).name };
};

module.exports = {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  validateProductCategory,
};
