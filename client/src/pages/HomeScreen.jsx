import React, { useMemo, useState } from 'react';
import { useGetProductsQuery } from '../store/slices/productsApiSlice';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader'; 
import { useParams } from 'react-router-dom';
import { PRODUCT_SORT_OPTIONS, filterAndSortProducts } from '../utils/productSort';

const HomeScreen = () => {
  const { keyword } = useParams();
  const [sortBy, setSortBy] = useState('latest');
  const [priceRange, setPriceRange] = useState({ minPrice: '', maxPrice: '' });
  const isPriceSort = sortBy === 'price';
  const hasPriceRange = priceRange.minPrice !== '' && priceRange.maxPrice !== '';
  // 📥 Fetching real data from backend!
  const { data: products, isLoading, error } = useGetProductsQuery({ keyword });
  const visibleProducts = useMemo(
    () => filterAndSortProducts(products || [], sortBy, isPriceSort && hasPriceRange ? priceRange : {}),
    [products, sortBy, priceRange, isPriceSort, hasPriceRange]
  );
  const recommendedProducts = useMemo(
    () => [...(products || [])]
      .sort((a, b) => ((b.rating || 0) * 10 + (b.numReviews || 0)) - ((a.rating || 0) * 10 + (a.numReviews || 0)))
      .slice(0, 4),
    [products]
  );

  const updatePriceRange = (field, value) => {
    setPriceRange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-10 sm:space-y-16 pb-16 sm:pb-20">
      {/* ... (Keep your Hero Section code from before) ... */}

      {/* 🏆 RECOMMENDED PRODUCTS */}
      <div className="w-full mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Recommended</p>
              <h3 className="text-xl font-black text-gray-900">Popular Products</h3>
            </div>
          </div>
          {isLoading ? (
            <Loader />
          ) : recommendedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No recommended products yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {recommendedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 📦 DYNAMIC PRODUCT GRID */}
      <div className="w-full mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <span className="text-green-500 font-black text-sm uppercase tracking-[0.3em]">Fresh Market</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900">
              {keyword ? `Search: ${keyword}` : 'Latest Arrivals'}
            </h2>
            <p className="text-sm font-semibold text-gray-500 mt-2">
              {products ? ` ` : 'Loading products...'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm font-bold text-gray-500">
              <span className="block mb-1">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:min-w-48 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-green-500"
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
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-bold text-gray-500">
                    <span className="block mb-1">Min Price</span>
                    <input
                      type="number"
                      min="0"
                      value={priceRange.minPrice}
                      onChange={(e) => updatePriceRange('minPrice', e.target.value)}
                      placeholder="0"
                      className="w-full sm:w-32 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-green-500"
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
                      className="w-full sm:w-32 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm outline-none transition-colors focus:border-green-500"
                    />
                  </label>
                </div>
                {!hasPriceRange && (
                  <p className="mt-2 text-xs font-bold text-green-600">
                    Enter both min and max price.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader /></div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-6 rounded-2xl border border-red-100 font-bold">
            {error?.data?.message || error.error}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center font-bold text-gray-500">
            {isPriceSort && hasPriceRange
              ? 'No products match this price range.'
              : 'No products found.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-5 xl:gap-6">
            {visibleProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
