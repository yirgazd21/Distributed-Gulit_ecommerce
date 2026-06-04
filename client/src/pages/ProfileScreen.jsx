import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaUser, FaBoxOpen, FaMapMarkerAlt, FaTimes, FaHeart, FaHistory, FaHome, FaRegHeart, FaCreditCard, FaUndoAlt, FaCamera, FaTrashAlt, FaBullhorn } from 'react-icons/fa';
import { useGetMyOrdersQuery, useRequestOrderRefundMutation } from '../store/slices/ordersApiSlice';
import { BASE_URL } from '../store/slices/apiSlice';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useGetPlatformUpdatesQuery } from '../store/slices/platformApiSlice';
import RichTextMessage from '../components/RichTextMessage';

// 👇 Import the API hook and Redux action
import { useProfileMutation } from '../store/slices/usersApiSlice';
import {
  useGetUserFavoritesQuery,
  useAddToFavoritesMutation,
  useRemoveFromFavoritesMutation,
  useGetUserBrowseHistoryQuery,
  useRemoveFromBrowseHistoryMutation
} from '../store/slices/usersApiSlice';
import { setCredentials } from '../store/slices/authSlice';
import { saveShippingAddress } from '../store/slices/cartSlice';
import Loader from '../components/Loader';
import BuyerSidebar from '../components/BuyerSidebar';

const ProfileScreen = () => {
  const dispatch = useDispatch();

  // 1. URL Parameter Logic (Fixes the blank page issue)
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const tabParam = sp.get('tab');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [ordersView, setOrdersView] = useState('pending');
  // Set default tab based on URL or default to 'orders'
  const [activeTab, setActiveTab] = useState(tabParam || 'orders');

  // Payment card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardType, setCardType] = useState('visa');

  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');

  const { userInfo } = useSelector((state) => state.auth);
  const { shippingAddress } = useSelector((state) => state.cart);

  // API Hooks
  const { data: orders, isLoading: loadingOrders, error: errorOrders } = useGetMyOrdersQuery();
  const [updateProfile, { isLoading }] = useProfileMutation();
  const [requestOrderRefund, { isLoading: loadingRefundRequest }] = useRequestOrderRefundMutation();
  const [refundReasons, setRefundReasons] = useState({});

  // Favorites and Browse History API hooks
  const { data: favorites = [], isLoading: loadingFavorites } = useGetUserFavoritesQuery();
  const { data: browseHistory = [], isLoading: loadingBrowseHistory } = useGetUserBrowseHistoryQuery();
  const [addToFavorites] = useAddToFavoritesMutation();
  const [removeFromFavorites] = useRemoveFromFavoritesMutation();
  const [removeFromBrowseHistory] = useRemoveFromBrowseHistoryMutation();
  const latestOrders = useMemo(
    () => [...(orders || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [orders]
  );
  const pendingOrders = useMemo(
    () => latestOrders.filter((order) => !order.isDelivered),
    [latestOrders]
  );
  const completedOrders = useMemo(
    () => latestOrders.filter((order) => order.isDelivered),
    [latestOrders]
  );
  const latestFavorites = useMemo(
    () => [...favorites].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [favorites]
  );
  const latestBrowseHistory = useMemo(
    () => [...browseHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [browseHistory]
  );

  // Watch for URL changes to switch tabs automatically
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Populate form with existing user data on load
  useEffect(() => {
    if (userInfo) {
      setName(userInfo.name);
      setEmail(userInfo.email);

      // Set profile image if exists
      if (userInfo.profileImage) {
        setProfileImagePreview(`${BASE_URL}${userInfo.profileImage}`);
      }

      const savedAddress = userInfo.address || shippingAddress || {};
      setPhoneNumber(savedAddress.phoneNumber || '');
      setAddress(savedAddress.address || '');
      setCity(savedAddress.city || '');
      setPostalCode(savedAddress.postalCode || '');
      setCountry(savedAddress.country || 'Ethiopia');
    }
  }, [userInfo, shippingAddress]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
    } else {
      try {
        const res = await updateProfile({
          _id: userInfo._id,
          name,
          email,
          password,
        }).unwrap();
        dispatch(setCredentials({ ...userInfo, ...res }));
        toast.success('Profile updated successfully');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    }
  };

  const addressSubmitHandler = async (e) => {
    e.preventDefault();

    const nextAddress = {
      phoneNumber,
      address,
      city,
      postalCode,
      country,
    };

    try {
      const res = await updateProfile({
        _id: userInfo._id,
        name,
        email,
        address: nextAddress,
      }).unwrap();

      dispatch(setCredentials({ ...userInfo, ...res, address: nextAddress }));
      dispatch(saveShippingAddress(nextAddress));
      toast.success('Address updated successfully');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update address');
    }
  };

  const paymentCardSubmitHandler = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!cardNumber || !cardExpiry || !cardCvv || !cardHolderName) {
      toast.error('Please fill in all card details');
      return;
    }

    // Simple card number validation (16 digits)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast.error('Please enter a valid card number');
      return;
    }

    // Expiry validation
    const [month, year] = cardExpiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12 ||
      (parseInt(year) < currentYear) ||
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      toast.error('Please enter a valid expiry date');
      return;
    }

    // CVV validation
    if (cardCvv.length < 3 || cardCvv.length > 4) {
      toast.error('Please enter a valid CVV');
      return;
    }

    try {
      // Here you would typically send the card data to your backend
      // For now, we'll just show a success message
      toast.success('Payment method added successfully!');

      // Clear form
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardHolderName('');
      setCardType('visa');
    } catch (err) {
      toast.error('Failed to add payment method');
    }
  };

  const toggleFavorite = async (productId) => {
    try {
      const isCurrentlyFavorite = favorites.some(fav => fav.id === productId);

      if (isCurrentlyFavorite) {
        await removeFromFavorites(productId).unwrap();
        toast.success('Removed from favorites');
      } else {
        await addToFavorites(productId).unwrap();
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update favorites');
    }
  };

  const requestRefundHandler = async (orderId) => {
    try {
      const payload = refundReasons[orderId] || {};
      const criteria = payload.criteria;
      const details = (payload.details || '').trim();
      if (!criteria) {
        toast.error('Please select a refund reason');
        return;
      }
      await requestOrderRefund({ orderId, criteria, details }).unwrap();
      toast.success('Refund request sent to the seller');
      setRefundReasons((prev) => ({ ...prev, [orderId]: { criteria: prev[orderId]?.criteria, details: '' } }));
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to request refund');
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
    );

    if (confirmDelete) {
      try {
        // Here you would call a delete account API
        // For now, we'll just show a message
        toast.success('Account deletion request submitted. You will be logged out shortly.');

        // In a real implementation, you would:
        // 1. Call the delete account API
        // 2. Clear local storage
        // 3. Redirect to home page
        // 4. Dispatch logout action

        // For demo purposes, just show the message
      } catch (error) {
        toast.error('Failed to delete account. Please try again.');
      }
    }
  };

  const isCriteriaAllowed = (criteria, order) => {
    const now = new Date();
    const paidAt = order.paidAt ? new Date(order.paidAt) : null;
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
    const est = order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate) : paidAt;

    if (criteria === 'wrong_product') {
      // Server checks days since paidAt — no delivery required
      if (!paidAt) return false;
      const diffDays = Math.floor((now - paidAt) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }
    if (criteria === 'delay_above_5_days') {
      if (!est || order.isDelivered) return false;
      const diffDays = Math.floor((now - est) / (1000 * 60 * 60 * 24));
      return diffDays >= 5;
    }
    // For damage/missing/not working/quality issues require delivered and within 7 days
    if (['damaged_item', 'missing_items', 'product_not_working', 'quality_issue', 'other'].includes(criteria)) {
      if (!deliveredAt) return false;
      const diffDays = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    return false;
  };

  const { data: platformData } = useGetPlatformUpdatesQuery({ audience: 'buyer' }, { skip: !userInfo });
  const platformUpdates = platformData?.updates || [];

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="w-full mx-auto px-3 sm:px-4 lg:px-2 py-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          My Account
        </h1>

        <div className="flex w-full gap-4 items-start">
          <BuyerSidebar activeKey={activeTab} />

          <div className="space-y-6 flex-1">
            {/* Dashboard Tab — Platform Updates */}
            {activeTab === 'dashboard' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaBullhorn className="text-emerald-500" /> Platform Updates
                </h2>
                {platformUpdates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FaBullhorn size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No platform updates yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {platformUpdates.map((update) => (
                      <div
                        key={update._id}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white">
                            <FaBullhorn size={12} />
                          </span>
                          <span className="text-xs uppercase tracking-widest font-black text-emerald-700">
                            {update.priority === 'high' ? '🔴 High Priority' : update.priority === 'medium' ? '🟡 Medium Priority' : 'Platform Update'}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {update.createdAt ? new Date(update.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-2">{update.title}</h3>
                        <RichTextMessage
                          text={update.message}
                          className="text-sm text-gray-700 leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                  <FaBoxOpen className="text-green-500" /> My Orders
                </h2>
                {loadingOrders ? (
                  <Loader />
                ) : errorOrders ? (
                  <p className="text-red-500">Error loading orders</p>
                ) : orders?.length === 0 ? (
                  <p className="text-gray-600">No orders found</p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-3 mb-5">
                      <button
                        type="button"
                        onClick={() => setOrdersView('pending')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${ordersView === 'pending' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        Pending ({pendingOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrdersView('completed')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${ordersView === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        Completed ({completedOrders.length})
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{ordersView === 'pending' ? 'Pending Orders' : 'Completed Orders'}</h3>
                      {(ordersView === 'pending' ? pendingOrders : completedOrders).length === 0 ? (
                        <p className="text-gray-600">No {ordersView === 'pending' ? 'pending' : 'completed'} orders.</p>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {(ordersView === 'pending' ? pendingOrders : completedOrders).map((order) => (
                            <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                <div>
                                  <p className="font-bold text-lg">Order #{order._id.slice(-8)}</p>
                                  <p className="text-sm text-gray-600">
                                    Ordered on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-green-600">Total: ${order.totalPrice}</p>
                                  <p className={`text-sm ${ordersView === 'pending' ? 'text-yellow-700' : 'text-blue-700'}`}>
                                    {ordersView === 'pending' ? 'Pending' : 'Completed'}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {order.orderItems?.map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                                  >
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                    />

                                    <div className="grow cursor-pointer">
                                      <Link
                                        to={`/order/${order._id}`}
                                        className="font-semibold text-gray-800 hover:text-green-600 transition-colors"
                                      >
                                        {item.name}


                                        <p className="text-sm text-gray-600">
                                          Quantity: {item.qty}
                                        </p>

                                        <p className="text-sm font-medium text-green-600">
                                          ${item.price} each
                                        </p></Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaCreditCard className="text-green-500" /> Payment Methods
                </h2>

                <div className="space-y-6">
                  {/* Add New Card Section */}
                  <div className="border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Payment Method</h3>

                    <form onSubmit={paymentCardSubmitHandler} className="space-y-4">
                      {/* Card Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                        <div className="grid grid-cols-3 gap-3">
                          <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${cardType === 'visa' ? 'border-blue-500 bg-gray-50' : 'border-gray-200 hover:border-blue-300'}`}>
                            <input
                              type="radio"
                              value="visa"
                              checked={cardType === 'visa'}
                              onChange={(e) => setCardType(e.target.value)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">Visa</span>
                          </label>
                          <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${cardType === 'mastercard' ? 'border-red-500 bg-gray-50' : 'border-gray-200 hover:border-red-300'}`}>
                            <input
                              type="radio"
                              value="mastercard"
                              checked={cardType === 'mastercard'}
                              onChange={(e) => setCardType(e.target.value)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">Mastercard</span>
                          </label>
                          <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${cardType === 'amex' ? 'border-green-500 bg-gray-50' : 'border-gray-200 hover:border-green-300'}`}>
                            <input
                              type="radio"
                              value="amex"
                              checked={cardType === 'amex'}
                              onChange={(e) => setCardType(e.target.value)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">American Express</span>
                          </label>
                        </div>
                      </div>

                      {/* Card Number */}
                      <div>
                        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number
                        </label>
                        <input
                          type="text"
                          id="cardNumber"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          maxLength="19"
                        />
                      </div>

                      {/* Card Holder Name */}
                      <div>
                        <label htmlFor="cardHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          id="cardHolderName"
                          value={cardHolderName}
                          onChange={(e) => setCardHolderName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      {/* Expiry and CVV */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            id="cardExpiry"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2'))}
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            maxLength="5"
                          />
                        </div>
                        <div>
                          <label htmlFor="cardCvv" className="block text-sm font-medium text-gray-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            id="cardCvv"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                      >
                        Add Payment Method
                      </button>
                    </form>
                  </div>

                  {/* Saved Cards Section */}
                  <div className="border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Payment Methods</h3>
                    <p className="text-gray-600 text-sm">No saved payment methods yet. Add one above to get started.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Refunds Tab */}
            {activeTab === 'refunds' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                  <FaUndoAlt className="text-green-500" /> Refunds
                </h2>
                {loadingOrders ? (
                  <Loader />
                ) : errorOrders ? (
                  <p className="text-red-500">Error loading refund options</p>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {latestOrders.filter((order) => order.isPaid && !order.isDelivered).length === 0 ? (
                      <p className="text-gray-600">No orders are currently eligible for a delivery refund request.</p>
                    ) : (
                      latestOrders
                        .filter((order) => order.isPaid)
                        .map((order) => {
                          const firstItem = order.orderItems?.[0];
                          const itemCount = order.orderItems?.length || 0;
                          const imageUrl = firstItem?.image?.startsWith('http')
                            ? firstItem.image
                            : `${BASE_URL}${firstItem?.image || ''}`;

                          const refundStatusText = order.refundStatus === 'requested'
                            ? 'Refund request sent'
                            : order.refundStatus === 'completed'
                              ? `Refund completed${order.refundAmount ? `: ${Number(order.refundAmount).toLocaleString()} ETB` : ''}`
                              : 'Paid but not marked as delivered';

                          return (
                            <div key={order._id} className="rounded-xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md">
                              <div className="flex flex-col gap-4 lg:gap-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-24 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                                    {firstItem?.image ? (
                                      <img
                                        src={imageUrl}
                                        alt={firstItem.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                        No image
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate">
                                      {firstItem?.name || 'Product item'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {itemCount > 1 ? `${itemCount} items in order` : `${firstItem?.qty || 1} qty`}
                                    </p>
                                    <p className="text-sm text-green-600 font-semibold mt-1">
                                      {order.totalPrice} ETB total
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <div>
                                    <p className="font-bold text-gray-900">Order #{order._id.slice(-8)}</p>
                                    <p className="text-sm text-gray-600">Paid with {order.paymentMethod || 'N/A'}</p>
                                  </div>
                                  <p className={`text-xs font-semibold ${
                                    order.refundStatus === 'completed' ? 'text-teal-600' :
                                    order.refundStatus === 'requested' ? 'text-amber-600' :
                                    order.refundStatus === 'rejected' ? 'text-red-600' :
                                    'text-amber-700'
                                  }`}>{refundStatusText}</p>
                                </div>

                                {(!order.refundStatus || order.refundStatus === 'none') && (
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <select
                                      value={(refundReasons[order._id] && refundReasons[order._id].criteria) || ''}
                                      onChange={(e) =>
                                        setRefundReasons((prev) => ({
                                          ...prev,
                                          [order._id]: {
                                            ...(prev[order._id] || {}),
                                            criteria: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 bg-white text-gray-900"
                                    >
                                      <option value="">Select reason</option>
                                      <option value="damaged_item" disabled={!isCriteriaAllowed('damaged_item', order)}>
                                        Damaged item
                                      </option>
                                      <option value="wrong_product" disabled={!isCriteriaAllowed('wrong_product', order)}>
                                        Wrong product (within 3 days)
                                      </option>
                                      <option value="missing_items" disabled={!isCriteriaAllowed('missing_items', order)}>
                                        Missing items
                                      </option>
                                      <option value="product_not_working" disabled={!isCriteriaAllowed('product_not_working', order)}>
                                        Product not working
                                      </option>
                                      <option value="quality_issue" disabled={!isCriteriaAllowed('quality_issue', order)}>
                                        Quality issue
                                      </option>
                                      <option value="delay_above_5_days" disabled={!isCriteriaAllowed('delay_above_5_days', order)}>
                                        Delayed &gt; 5 days
                                      </option>
                                    </select>
                                    <input
                                      type="text"
                                      value={(refundReasons[order._id] && refundReasons[order._id].details) || ''}
                                      onChange={(e) =>
                                        setRefundReasons((prev) => ({
                                          ...prev,
                                          [order._id]: {
                                            ...(prev[order._id] || {}),
                                            details: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Optional details"
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 bg-white text-gray-900"
                                    />
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => requestRefundHandler(order._id)}
                                  disabled={loadingRefundRequest || order.refundStatus === 'requested' || order.refundStatus === 'completed'}
                                  className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed
                                    ${order.refundStatus === 'requested'
                                      ? 'bg-amber-500 disabled:bg-gray-500'
                                      : order.refundStatus === 'completed'
                                      ? 'bg-teal-500 disabled:bg-teal-400'
                                      : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
                                    }`}
                                >
                                  {order.refundStatus === 'requested'
                                    ? 'Requested'
                                    : order.refundStatus === 'completed'
                                    ? 'Refunded'
                                    : 'Request Refund'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaHeart className="text-red-500" /> Favorites
                </h2>

                {/* Favorites Content */}
                {activeTab === 'favorites' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaHeart className="text-red-500" />
                      Your Favorite Products
                    </h3>
                    {loadingFavorites ? (
                      <Loader />
                    ) : favorites.length === 0 ? (
                      <div className="text-center py-8">
                        <FaHeart className="text-gray-300 text-4xl mx-auto mb-4" />
                        <p className="text-gray-500">No favorite products yet</p>
                        <p className="text-sm text-gray-400 mt-2">Products you favorite will appear here</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {latestFavorites.map((item) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <div className="h-32 mb-3 overflow-hidden rounded-lg">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-start justify-between mb-2 gap-3">
                              <div className="grow min-w-0">
                                <h4 className="font-semibold text-gray-800 text-sm truncate">{item.name}</h4>
                                <p className="text-xs text-gray-500">Added on {new Date(item.date).toLocaleDateString()}</p>
                                <p className="text-base font-bold text-green-600 mt-1">${item.price}</p>
                              </div>
                              <button
                                onClick={() => toggleFavorite(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove from favorites"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Favorite</span>
                              <FaHeart className="text-red-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Browse History Content */}
                {activeTab === 'browse-history' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaHistory className="text-blue-500" />
                      Your Browse History
                    </h3>
                    {loadingBrowseHistory ? (
                      <Loader />
                    ) : browseHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <FaHistory className="text-gray-300 text-4xl mx-auto mb-4" />
                        <p className="text-gray-500">No browse history yet</p>
                        <p className="text-sm text-gray-400 mt-2">Products you've viewed will appear here</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {browseHistory.map((item) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="grow">
                                <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                <p className="text-sm text-gray-600">Viewed on {new Date(item.date).toLocaleDateString()}</p>
                                <p className="text-sm font-medium text-green-600">${item.price}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleFavorite(item.id)}
                                  className={`p-2 rounded-full transition-colors ${favorites.some(fav => fav.id === item.id)
                                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                  title={favorites.some(fav => fav.id === item.id) ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  {favorites.some(fav => fav.id === item.id) ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await removeFromBrowseHistory(item.id).unwrap();
                                      toast.success('Removed from history');
                                    } catch (error) {
                                      toast.error(error?.data?.message || 'Failed to remove from history');
                                    }
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-1"
                                  title="Remove from history"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {(activeTab === 'browse-history' || activeTab === 'history') && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaHistory className="text-blue-500" /> Browse History
                </h2>
                {loadingBrowseHistory ? (
                  <Loader />
                ) : browseHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FaHistory className="text-gray-300 text-4xl mx-auto mb-4" />
                    <p className="text-gray-500">No browse history yet</p>
                    <p className="text-sm text-gray-400 mt-2">Products you've viewed will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {latestBrowseHistory.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="grow">
                            <h4 className="font-semibold text-gray-800">{item.name}</h4>
                            <p className="text-sm text-gray-600">Viewed on {new Date(item.date).toLocaleDateString()}</p>
                            <p className="text-sm font-medium text-green-600">${item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className={`p-2 rounded-full transition-colors ${favorites.some(fav => fav.id === item.id)
                                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                              title={favorites.some(fav => fav.id === item.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favorites.some(fav => fav.id === item.id) ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await removeFromBrowseHistory(item.id).unwrap();
                                  toast.success('Removed from history');
                                } catch (error) {
                                  toast.error(error?.data?.message || 'Failed to remove from history');
                                }
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Remove from history"
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaUser className="text-green-500" /> Profile Settings
                </h2>

                {/* Profile Image Section */}
                <div className="mb-8 p-6 border border-gray-200 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Picture</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {profileImagePreview || userInfo?.profileImage ? (
                          <img
                            src={profileImagePreview || `${BASE_URL}${userInfo.profileImage}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FaUser className="text-gray-400 text-3xl" />
                        )}
                      </div>
                      <label
                        htmlFor="profileImage"
                        className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors"
                      >
                        <FaCamera className="text-sm" />
                      </label>
                      <input
                        type="file"
                        id="profileImage"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Upload a new profile picture. Max size: 5MB
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: JPG, PNG, GIF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Information Form */}
                <form onSubmit={submitHandler} className="space-y-4 mb-8">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>

                {/* Danger Zone */}
                <div className="border border-red-200 rounded-xl p-6 bg-red-50">
                  <h3 className="text-lg font-semibold text-red-800 mb-4">Danger Zone</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                      <div>
                        <h4 className="font-medium text-gray-900">Delete Account</h4>
                        <p className="text-sm text-gray-600">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-2"
                      >
                        <FaTrashAlt className="text-sm" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                  <FaMapMarkerAlt className="text-green-500" /> Address Settings
                </h2>
                <p className="text-gray-600 mb-6">Add or edit the address used to fill your checkout shipping details.</p>

                <form onSubmit={addressSubmitHandler} className="space-y-5">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      placeholder="e.g. 0911234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Street Address / Kebele</label>
                    <input
                      type="text"
                      id="address"
                      placeholder="e.g. Bole Subcity, Kebele 04"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        id="city"
                        placeholder="Addis Ababa"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                      <input
                        type="text"
                        id="postalCode"
                        placeholder="1000"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-md font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Address'}
                  </button>
                </form>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
