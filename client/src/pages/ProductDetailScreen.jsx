import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetProductDetailsQuery, useCreateReviewMutation } from '../store/slices/productsApiSlice';
import { useAddToBrowseHistoryMutation } from '../store/slices/usersApiSlice';
import { addToCart } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import {
  FaStar,
  FaShoppingCart,
  FaArrowLeft,
  FaCheckCircle,
  FaUserCircle,
  FaInfoCircle,
  FaTimes,
  FaTag
} from 'react-icons/fa';
// 👇 IMPORTANT: Make sure this import path is correct for your project structure
import { BASE_URL, getActiveBackendUrl } from '../store/slices/apiSlice';

const ProductDetailScreen = () => {
  const { id: productId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [imageRefreshKey, setImageRefreshKey] = useState(0); // Force image re-render on backend rotation

  const { userInfo } = useSelector((state) => state.auth);

  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(productId);
  const [createReview, { isLoading: loadingProductReview }] = useCreateReviewMutation();
  const [addToBrowseHistory] = useAddToBrowseHistoryMutation();

  // Reset the active image if the product data loads or changes
  useEffect(() => {
    if (product && product.image) {
      setActiveImage(product.image);
    }
  }, [product]);

  // Track browse history when user views a product
  useEffect(() => {
    if (product && userInfo) {
      // Add to browse history (only if user is logged in)
      addToBrowseHistory(product._id).unwrap().catch((error) => {
        // Silently fail if browse history tracking fails (don't show error to user)
        console.log('Browse history tracking failed:', error);
      });
    }
  }, [product, userInfo, addToBrowseHistory]);

  // 🔄 CRITICAL FIX: Listen for backend rotation and refresh images
  useEffect(() => {
    const handleBackendRotation = () => {
      console.log('🔄 Backend rotated - Refreshing images...');
      // Increment key to force React to remount image elements with new BASE_URL
      setImageRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('backendRotated', handleBackendRotation);
    return () => window.removeEventListener('backendRotated', handleBackendRotation);
  }, []);

  const addToCartHandler = () => {
    dispatch(addToCart({
      ...product,
      image: currentDisplayImage,
      selectedImage: currentDisplayImage,
      cartItemId: `${product._id}-${currentDisplayImage}`,
      qty,
    }));
    navigate('/cart');
  };

  const submitReviewHandler = async (e) => {
    e.preventDefault();
    try {
      await createReview({ productId, rating, comment }).unwrap();
      refetch();
      toast.success('Review Submitted!');
      setRating(0);
      setComment('');
    } catch (err) {
      const errorMessage = err?.data?.message || err.error;

      if (errorMessage.includes('delivered') || errorMessage.includes('already reviewed')) {
        setModalMessage(errorMessage);
        setShowModal(true);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 font-bold p-10">{error?.data?.message || error.error}</div>;

  // 🖼️ Combine main image and gallery images into one array, filtering out nulls
  // This handles your two separate DB attributes correctly.
  const allImages = [product.image, ...(product.images || [])].filter(Boolean);

  // 💰 Calculate Discounts
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const savedAmount = hasDiscount ? product.originalPrice - product.price : 0;

  // Ensure we have an active image to display, fallback to main image if state is empty
  const currentDisplayImage = activeImage || product.image;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4 relative">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-green-500 font-bold mb-8 transition-colors">
          <FaArrowLeft size={12} /> Back to Market
        </Link>

        {/* TOP SECTION: Product Info & Slider */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

            {/* LEFT: Interactive Image Gallery */}
            <div className="p-8 bg-white dark:bg-slate-900 flex flex-col md:flex-row-reverse gap-6 items-start border-r border-gray-100 dark:border-slate-800">

              {/* Main Large Image */}
              <div className="w-full aspect-square bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-inner flex items-center justify-center">
                {/* 👇 FIX: Ensure BASE_URL is prepended */}
                <img
                  key={`main-img-${imageRefreshKey}`}
                  src={`${BASE_URL}${currentDisplayImage}`}
                  alt={product.name}
                  className="w-full h-full object-contain p-4 transition-all duration-300"
                  onError={(e) => {
                    const url1 = `${getActiveBackendUrl()}${currentDisplayImage}`;
                    const url2Base = (import.meta.env.VITE_FALLBACK_API_URL || '').replace(/\/$/, '');
                    const url2 = url2Base ? `${url2Base}${currentDisplayImage}` : '';

                    if (e.target.src !== url1) {
                      e.target.src = url1;
                    } else if (url2 && e.target.src !== url2) {
                      e.target.src = url2;
                    } else {
                      e.target.src = '/placeholder.jpg';
                    }
                  }}
                />
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:max-h-[500px] w-full md:w-24 pb-2 md:pb-0 scrollbar-hide">
                  {allImages.map((imgPath, index) => (
                    <button
                      key={index}
                      // 👇 FIX: Removed onMouseEnter. Only changes on Click now.
                      onClick={() => setActiveImage(imgPath)}
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all bg-white dark:bg-slate-800 ${currentDisplayImage === imgPath ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 dark:border-slate-700 hover:border-red-300'}`}
                    >
                      {/* 👇 FIX: Ensure BASE_URL is prepended to thumbnails too */}
                      <img
                        key={`thumb-img-${index}-${imageRefreshKey}`}
                        src={`${BASE_URL}${imgPath}`}
                        alt={`thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const url1 = `${getActiveBackendUrl()}${imgPath}`;
                          const url2Base = (import.meta.env.VITE_FALLBACK_API_URL || '').replace(/\/$/, '');
                          const url2 = url2Base ? `${url2Base}${imgPath}` : '';

                          if (e.target.src !== url1) {
                            e.target.src = url1;
                          } else if (url2 && e.target.src !== url2) {
                            e.target.src = url2;
                          } else {
                            e.target.src = '/placeholder.jpg';
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Details & Actions (No changes needed here) */}
            <div className="p-8 md:p-12 flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <FaTag className="text-gray-300" /> {product.brand}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-slate-100 leading-tight mb-4">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex text-yellow-400 text-sm">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className={i < product.rating ? 'text-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-slate-400 underline underline-offset-4 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100">
                  {product.rating.toFixed(1)} ({product.numReviews} Reviews)
                </span>
              </div>

              {/* 💸 Dynamic Pricing Block */}
              <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-white dark:from-slate-800 dark:to-slate-900 border border-red-100 dark:border-slate-700 rounded-2xl">
                {hasDiscount ? (
                  <>
                    <div className="flex items-end gap-3 mb-1">
                      <span className="text-4xl font-black text-red-600">
                        ETB {product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="bg-red-500 text-white text-sm font-black px-2 py-1 rounded-md shadow-sm">
                        -{discountPercentage}%
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-red-600 mb-2">
                      Discount: {discountPercentage}%
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <span className="line-through text-gray-400">
                        ETB {product.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-red-500">
                        (Save ETB {savedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-black text-red-600 dark:text-red-400">
                    ETB {product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div className="text-gray-600 dark:text-slate-300 leading-relaxed mb-8 flex-grow">
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2 uppercase tracking-wide">Product Details</h3>
                <p className="whitespace-pre-line">{product.description}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-700 dark:text-slate-200">Availability:</span>
                  {product.countInStock > 0 ? (
                    <span className="text-green-600 font-bold flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full text-sm">
                      <FaCheckCircle /> {product.countInStock} In Stock
                    </span>
                  ) : (
                    <span className="text-red-500 font-bold bg-red-100 px-3 py-1 rounded-full text-sm">Out of Stock</span>
                  )}
                </div>

                {product.countInStock > 0 && (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-bold text-gray-700 dark:text-slate-200">Quantity:</span>
                    <select
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl px-4 py-2 font-bold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none w-24"
                    >
                      {[...Array(product.countInStock).keys()].map((x) => (
                        <option key={x + 1} value={x + 1}>{x + 1}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={addToCartHandler}
                  disabled={product.countInStock === 0}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-lg shadow-red-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center gap-3"
                >
                  <FaShoppingCart /> {product.countInStock === 0 ? 'Currently Unavailable' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Reviews (No changes needed here) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
            <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">Customer Reviews</h2>
            {product.reviews.length === 0 && <p className="text-gray-500 bg-gray-50 p-4 rounded-xl">No reviews yet. Be the first!</p>}
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-50 dark:border-slate-800 pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FaUserCircle className="text-gray-300 text-3xl" />
                    <div>
                      <strong className="block text-sm text-gray-800 dark:text-slate-100">{review.name}</strong>
                      <div className="flex text-yellow-400 text-[10px] mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    <span className="ml-auto text-xs text-gray-400">{review.createdAt.substring(0, 10)}</span>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 text-sm pl-11">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 h-fit">
            <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">Write a Review</h2>
            {userInfo ? (
              <form onSubmit={submitReviewHandler} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    required
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select...</option>
                    <option value="1">1 - Poor</option>
                    <option value="2">2 - Fair</option>
                    <option value="3">3 - Good</option>
                    <option value="4">4 - Very Good</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Comment</label>
                  <textarea
                    row="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-red-500 resize-none h-32"
                    placeholder="What did you think about the product?"
                  ></textarea>
                </div>
                <button
                  disabled={loadingProductReview}
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-bold transition-all disabled:bg-gray-400"
                >
                  {loadingProductReview ? <Loader /> : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="bg-blue-50 text-blue-700 p-6  dark:bg-black dark:text-blue-300 rounded-2xl text-center">
                <p className="mb-3 font-medium">Please sign in to write a review</p>
                <Link to="/login" className="inline-block bg-white text-green-400 font-bold px-6 py-2 rounded-lg shadow-sm">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
          ></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 transform transition-all scale-100 p-8 text-center animate-fade-in-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FaTimes />
            </button>
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaInfoCircle className="text-4xl text-blue-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-3">Notice</h3>
            <p className="text-gray-600 dark:text-slate-300 font-medium leading-relaxed mb-8">
              {modalMessage}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailScreen;
