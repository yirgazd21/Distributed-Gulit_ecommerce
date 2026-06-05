import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaTrash, FaArrowLeft, FaShoppingBag, FaTag } from 'react-icons/fa';
import { addToCart, removeFromCart, savePaymentMethod } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import { BASE_URL, getActiveBackendUrl } from '../store/slices/apiSlice';
import { useAddToCartDBMutation, useRemoveFromCartDBMutation } from '../store/slices/usersApiSlice';

const CartScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [imageRefreshKey, setImageRefreshKey] = useState(0); // Force image re-render on backend rotation

  const cart = useSelector((state) => state.cart);
  const { cartItems } = cart;
  const { userInfo } = useSelector((state) => state.auth) || {};

  const [addToCartDB] = useAddToCartDBMutation();
  const [removeFromCartDB] = useRemoveFromCartDBMutation();

  // 🔄 CRITICAL FIX: Listen for backend rotation and refresh images
  useEffect(() => {
    const handleBackendRotation = () => {
      console.log('🔄 Backend rotated - Refreshing cart images...');
      setImageRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('backendRotated', handleBackendRotation);
    return () => window.removeEventListener('backendRotated', handleBackendRotation);
  }, []);

  const addToCartHandler = async (product, qty) => {
    // Optimistic update
    dispatch(addToCart({ ...product, qty }));
    // Sync to DB
    try {
      await addToCartDB({
        productId: product._id || product.product,
        qty,
        selectedImage: product.selectedImage || product.image,
        cartItemId: product.cartItemId,
      }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update cart');
    }
  };

  const removeFromCartHandler = async (cartItemId) => {
    // Optimistic update
    dispatch(removeFromCart(cartItemId));
    // Sync to DB
    try {
      await removeFromCartDB(cartItemId).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to remove item');
    }
  };

  const checkoutHandler = () => {
    localStorage.removeItem('pendingPayItem');
    if (userInfo) {
      navigate('/shipping');
    } else {
      navigate('/login?redirect=/shipping');
    }
  };

  const payThisItemHandler = (item) => {
    localStorage.setItem('pendingPayItem', JSON.stringify(item));
    dispatch(savePaymentMethod('Chapa'));

    if (!userInfo) {
      const redirectTarget = cart.shippingAddress?.address ? '/payment' : '/shipping';
      navigate(`/login?redirect=${redirectTarget}`);
      return;
    }

    if (!cart.shippingAddress?.address) {
      navigate('/shipping');
    } else {
      navigate('/payment');
    }
  };

  // 💰 NEW: Calculate total savings across all discounted items in the cart
  const totalSavings = cartItems.reduce((acc, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return acc + ((item.originalPrice - item.price) * item.qty);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-slate-100 mb-8 flex items-center gap-3">
          <FaShoppingBag className="text-gray-900 dark:text-slate-100" /> Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* 👈 LEFT: CART ITEMS */}
          <div className="lg:col-span-8">
            {cartItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FaShoppingBag className="text-gray-300 text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link
                  to="/"
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-200"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.cartItemId || item._id} className="flex flex-col md:flex-row items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-4 last:border-0 last:pb-0 gap-4">

                      {/* Product Info */}
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <img
                          key={`cart-img-${item.cartItemId || item._id}-${imageRefreshKey}`}
                          src={`${BASE_URL}${item.image}`}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          width="72"
                          height="72"
                          className="w-16 h-16 md:w-20 md:h-20 object-contain p-1 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
                          onError={(e) => {
                            const url1 = `${getActiveBackendUrl()}${item.image}`;
                            const url2Base = (import.meta.env.VITE_FALLBACK_API_URL || '').replace(/\/$/, '');
                            const url2 = url2Base ? `${url2Base}${item.image}` : '';

                            if (e.target.src !== url1) {
                              e.target.src = url1;
                            } else if (url2 && e.target.src !== url2) {
                              e.target.src = url2;
                            } else {
                              e.target.src = '/placeholder.jpg';
                            }
                          }}
                        />
                        <div>
                          <Link to={`/product/${item._id}`} className="text-lg font-bold text-gray-800 dark:text-slate-100 hover:text-red-500 transition-colors block mb-1">
                            {item.name}
                          </Link>
                          {item.selectedImage && (
                            <p className="text-xs font-bold text-gray-400 mb-1">Selected option saved</p>
                          )}
                          {/* 💰 NEW: Show original price if discounted */}
                          <div className="text-sm font-medium">
                            <span className="text-gray-400">Unit Price: </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-gray-400 line-through mr-2">
                                {item.originalPrice.toLocaleString()} ETB
                              </span>
                            )}
                            <span className="text-red-600 dark:text-red-400 font-bold">{item.price.toLocaleString()} ETB</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls (Qty & Delete) */}
                      <div className="flex items-center justify-between w-full md:w-auto gap-8">
                        <select
                          value={item.qty}
                          onChange={(e) => addToCartHandler(item, Number(e.target.value))}
                          className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 font-bold text-gray-700 dark:text-slate-100 focus:outline-none focus:border-red-500"
                        >
                          {[...Array(item.countInStock).keys()].map((x) => (
                            <option key={x + 1} value={x + 1}>
                              {x + 1}
                            </option>
                          ))}
                        </select>

                        <div className="text-lg font-black text-gray-900 dark:text-slate-100 w-24 text-right">
                          {(item.price * item.qty).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCartHandler(item.cartItemId || item._id)}
                            className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>

                          <button
                            onClick={() => payThisItemHandler(item)}
                            className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                          >
                            Pay for this item
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 font-bold transition-colors mt-6 ml-2">
              <FaArrowLeft size={12} /> Continue Shopping
            </Link>
          </div>

          {/* 👉 RIGHT: CART SUMMARY */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-gray-100 dark:shadow-black/20 border border-gray-100 dark:border-slate-800 sticky top-24">
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">Order Summary</h2>

              <div className="space-y-4 text-sm mb-6">
                {/* Item Count & Subtotal */}
                <div className="flex justify-between items-center text-gray-600 dark:text-slate-300 font-medium">
                  <span>Items ({cartItems.reduce((acc, item) => acc + item.qty, 0)}):</span>
                  <span>
                    {cartItems.reduce((acc, item) => acc + ((item.originalPrice || item.price) * item.qty), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>

                {/* 💰 NEW: Total Savings Banner */}
                {totalSavings > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-300 font-bold bg-green-50 dark:bg-green-500/10 p-3 rounded-xl">
                    <span className="flex items-center gap-2"><FaTag /> Total Savings:</span>
                    <span>- {totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
                  </div>
                )}

                {/* Final Total */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">Total:</span>
                  <span className="text-3xl font-black text-red-600 dark:text-red-400">
                    {cartItems.reduce((acc, item) => acc + item.qty * item.price, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>

                <p className="text-xs text-gray-400 text-center mt-2">Taxes and shipping calculated at checkout.</p>
              </div>

              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={checkoutHandler}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black text-lg transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-red-200"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CartScreen;
