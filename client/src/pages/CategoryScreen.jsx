import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetProductsQuery } from '../store/slices/productsApiSlice';
import ProductCard from '../components/ProductCard'; // Ensure this path is correct
import Loader from '../components/Loader';
import { FaArrowLeft, FaBoxOpen } from 'react-icons/fa';
import { PRODUCT_SORT_OPTIONS, filterAndSortProducts } from '../utils/productSort';

const CategoryScreen = () => {
  const [sortBy, setSortBy] = useState('latest');
  const [priceRange, setPriceRange] = useState({ minPrice: '', maxPrice: '' });
  const isPriceSort = sortBy === 'price';
  const hasPriceRange = priceRange.minPrice !== '' && priceRange.maxPrice !== '';
  // 1. Get the category name from the URL (e.g., 'electronics')
  const { categoryName, subcategoryName } = useParams();
  const selectedCategory = decodeURIComponent(categoryName || '');
  const selectedSubcategory = subcategoryName ? decodeURIComponent(subcategoryName) : '';
  const isAllProducts = selectedCategory.toLowerCase() === 'all';

  // 2. Fetch products, passing the category to our updated API slice
  const { data: products, isLoading, error } = useGetProductsQuery({
    category: isAllProducts ? undefined : selectedCategory,
    subcategory: selectedSubcategory || undefined,
  });
  const visibleProducts = useMemo(
    () => filterAndSortProducts(products || [], sortBy, isPriceSort && hasPriceRange ? priceRange : {}),
    [products, sortBy, priceRange, isPriceSort, hasPriceRange]
  );

  const updatePriceRange = (field, value) => {
    setPriceRange((prev) => ({ ...prev, [field]: value }));
  };

  // Capitalize the first letter for the title
  const formattedCategory = isAllProducts
    ? 'All'
    : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
  const title = selectedSubcategory ? `${formattedCategory} / ${selectedSubcategory}` : formattedCategory;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 font-bold mb-4 transition-colors">
              <FaArrowLeft size={12} /> Back to Market
            </Link>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               <span className="text-red-600 capitalize">{title}</span> Products
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <p className="text-gray-500 font-medium">
              {products ? `${products.length} Items Found` : 'Loading...'}
            </p>
            <label className="text-sm font-bold text-gray-500">
              <span className="block mb-1">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-48 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-red-500"
              >
                {PRODUCT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {isPriceSort && (
              <div>
                <div className="flex gap-3">
                  <label className="text-sm font-bold text-gray-500">
                    <span className="block mb-1">Min Price</span>
                    <input
                      type="number"
                      min="0"
                      value={priceRange.minPrice}
                      onChange={(e) => updatePriceRange('minPrice', e.target.value)}
                      placeholder="0"
                      className="w-32 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-red-500"
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-500">
                    <span className="block mb-1">Max Price</span>
                    <input
                      type="number"
                      min="0"
                      value={priceRange.maxPrice}
                      onChange={(e) => updatePriceRange('maxPrice', e.target.value)}
                      placeholder="Any"
                      className="w-32 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-red-500"
                    />
                  </label>
                </div>
                {!hasPriceRange && (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    Enter both min and max price.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <Loader />
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-6 rounded-2xl font-bold text-center border border-red-100">
            {error?.data?.message || error.error}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm border border-gray-100 flex flex-col items-center">
             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <FaBoxOpen className="text-gray-300 text-5xl" />
             </div>
             <h2 className="text-2xl font-bold text-gray-800 mb-2">No products found</h2>
             <p className="text-gray-500 mb-8 max-w-md mx-auto">
               {isAllProducts
                 ? 'We currently do not have any products listed. Please check back later!'
                 : `We currently don't have any items listed in ${title}. Please check back later!`}
             </p>
             <Link to="/category/all" className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-red-200">
               View All Products
             </Link>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No products in this price range</h2>
            <p className="text-gray-500">Try changing the minimum or maximum price.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoryScreen;
