import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar } from 'react-icons/fa';
import { buildMediaUrl, handleMediaError } from '../utils/mediaUrl';
import {
  useAddToFavoritesMutation,
  useGetUserFavoritesQuery,
  useRemoveFromFavoritesMutation,
  useAddToCartDBMutation,
} from '../store/slices/usersApiSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [imageRefreshKey, setImageRefreshKey] = useState(0); // Force image re-render on backend rotation

  const { data: favorites = [] } = useGetUserFavoritesQuery(undefined, { skip: !userInfo });
  const [addToFavorites, { isLoading: addingFavorite }] = useAddToFavoritesMutation();
  const [removeFromFavorites, { isLoading: removingFavorite }] = useRemoveFromFavoritesMutation();
  const [addToCartDB, { isLoading: addingToCart }] = useAddToCartDBMutation();

  // 🔄 CRITICAL FIX: Listen for backend rotation and refresh images
  useEffect(() => {
    const handleBackendRotation = () => {
      console.log('🔄 Backend rotated - Refreshing product card image...');
      setImageRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('backendRotated', handleBackendRotation);
    return () => window.removeEventListener('backendRotated', handleBackendRotation);
  }, []);

  const isFavorite = favorites.some((fav) => String(fav.id) === String(product._id));

  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const addToCartHandler = async (e) => {
    e.preventDefault();

    // Guest cart not allowed — must be logged in
    if (!userInfo) {
      toast.info('Please log in to add items to your cart');
      navigate('/login');
      return;
    }

    if (product.countInStock === 0) return;

    try {
      const cartItemId = `${product._id}-${product.image}`;

      // 1. Optimistic update — instant UI feedback
      dispatch(addToCart({
        ...product,
        selectedImage: product.image,
        cartItemId,
        qty: 1,
      }));

      // 2. Persist to DB
      await addToCartDB({
        productId: product._id,
        qty: 1,
        selectedImage: product.image,
        cartItemId,
      }).unwrap();

      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add to cart');
    }
  };

  const favoriteHandler = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      toast.info('Please log in to save favorites');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await removeFromFavorites(product._id).unwrap();
        toast.success('Removed from favorites');
      } else {
        await addToFavorites(product._id).unwrap();
        toast.success('Added to favorites');
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update favorite');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm hover:shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300 flex flex-col h-full group">

      {/* Image */}
      <Link to={`/product/${product._id}`} className="relative block h-40 bg-gray-50 dark:bg-slate-800 overflow-hidden">
        <img
          key={`product-card-img-${product._id}-${imageRefreshKey}`}
          src={buildMediaUrl(product.image)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={handleMediaError(product.image)}
        />

        <button
          type="button"
          onClick={favoriteHandler}
          disabled={addingFavorite || removingFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all ${isFavorite
              ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
              : 'border-gray-200 bg-white/90 text-gray-400 hover:border-red-200 hover:text-red-500'
            } disabled:opacity-60`}
        >
          {isFavorite ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
        </button>

        {discountPercentage > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-[#ff0036] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            -{discountPercentage}%
          </div>
        )}

        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-gray-900 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="p-2.5 flex flex-col flex-grow bg-white dark:bg-slate-900">
        <Link to={`/product/${product._id}`}>
          <h3 className="text-xs font-medium text-gray-800 dark:text-slate-100 line-clamp-2 hover:text-[#ff0036] transition-colors leading-tight mb-1.5 min-h-[2rem]">
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2 min-h-[2rem]">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-1 mb-2">
          <FaStar className="text-yellow-400 text-[10px]" />
          <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200">
            {product.rating ? product.rating.toFixed(1) : '0.0'}
          </span>
          <span className="text-[10px] text-gray-400">({product.numReviews})</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[9px] font-bold text-[#ff0036]">ETB</span>
              <span className="text-base font-black text-[#ff0036] leading-none">
                {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-3 mt-0.5">
              {discountPercentage > 0 && (
                <span className="text-[9px] text-gray-400 line-through">
                  ETB {product.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={addToCartHandler}
            disabled={product.countInStock === 0 || addingToCart}
            title={userInfo ? 'Add to Cart' : 'Login to add to cart'}
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${product.countInStock === 0
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-red-50 text-[#ff0036] hover:bg-[#ff0036] hover:text-white'
              }`}
          >
            <FaShoppingCart size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
