const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subcategories: { type: [subcategorySchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
