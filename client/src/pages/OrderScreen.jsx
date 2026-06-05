import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useGetOrderDetailsQuery,
  usePayOrderMutation,
  useVerifyChapaPaymentMutation,
  useDeliverOrderMutation
} from '../store/slices/ordersApiSlice';

import { useCreateReviewMutation } from '../store/slices/productsApiSlice';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
  FaMapMarkerAlt,
  FaCreditCard,
  FaShoppingBag,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

import { BASE_URL } from '../store/slices/apiSlice';
import { getActiveBackendUrl } from '../utils/networkConfig';
import { useInitializeChapaPaymentMutation } from '../store/slices/ordersApiSlice';

const OrderScreen = () => {
  const { id: orderId } = useParams();

  const { data: order, refetch, isLoading, error } =
    useGetOrderDetailsQuery(orderId);

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();
  const [verifyChapaPayment] = useVerifyChapaPaymentMutation();
  const [deliverOrder, { isLoading: loadingDeliver }] = useDeliverOrderMutation();
  const [createReview, { isLoading: loadingReview }] = useCreateReviewMutation();

  const [initializeChapaPayment] = useInitializeChapaPaymentMutation();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [reviewInputs, setReviewInputs] = useState({});
  const [imageRefreshKey, setImageRefreshKey] = useState(0); // Force image re-render on backend rotation

  // 🔄 CRITICAL FIX: Listen for backend rotation and refresh images
  useEffect(() => {
    const handleBackendRotation = () => {
      console.log('🔄 Backend rotated - Refreshing order images...');
      setImageRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('backendRotated', handleBackendRotation);
    return () => window.removeEventListener('backendRotated', handleBackendRotation);
  }, []);

  const formatDate = (value) =>
    value ? String(value).substring(0, 10) : 'N/A';

  // ---------------- PAYMENT ----------------
  const successPaymentHandler = async () => {
    if (!order || order.isPaid) return;

    try {
      setIsProcessingPayment(true);

      const txRef = `order_${order._id}_${Date.now()}`;

      const res = await initializeChapaPayment({
        amount: order.totalPrice,
        email: order.user.email,
        first_name: order.user.name?.split(' ')[0] || order.user.name,
        last_name: order.user.name?.split(' ')[1] || '',
        tx_ref: txRef,
      }).unwrap();

      const checkoutUrl = res?.data?.checkout_url;

      if (!checkoutUrl) {
        throw new Error('Checkout URL not returned from Chapa');
      }

      // redirect to Chapa
      window.location.href = checkoutUrl;

    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      toast.error(err?.data?.message || err.message || 'Payment failed');
    }
  };

  // ---------------- DELIVERY ----------------
  const markDeliveredHandler = async () => {
    try {
      await deliverOrder(orderId).unwrap();
      refetch();
      toast.success('Order marked as delivered');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  // ---------------- REVIEW ----------------
  const setReviewField = (productId, field, value) => {
    setReviewInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const submitReviewHandler = async (productId) => {
    const review = reviewInputs[productId] || {};

    if (!review.rating || !review.comment?.trim()) {
      toast.error('Add rating and comment');
      return;
    }

    try {
      await createReview({
        productId,
        rating: Number(review.rating),
        comment: review.comment.trim(),
      }).unwrap();

      toast.success('Review submitted');

      setReviewInputs((prev) => ({
        ...prev,
        [productId]: { rating: '', comment: '' },
      }));
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  // ---------------- LOADING ----------------
  if (isLoading) return <Loader />;
  if (error)
    return (
      <div className="p-10 text-red-500 font-bold">
        {error?.data?.message || error.error}
      </div>
    );

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">

        <h1 className="text-2xl font-black mb-6">
          Order #{order._id}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="md:col-span-2 space-y-6">

            {/* SHIPPING */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-bold flex gap-2 items-center">
                <FaMapMarkerAlt /> Shipping
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                {order.shippingAddress.address}, {order.shippingAddress.city}
              </p>

              {order.deliveryStatus === 'delivered' || (!order.deliveryStatus && order.isDelivered) ? (
                <p className="text-green-600 mt-3">Delivered</p>
              ) : order.deliveryStatus === 'preparing' ? (
                <p className="text-blue-600 mt-3">Preparing for shipment</p>
              ) : order.deliveryStatus === 'out_for_delivery' ? (
                <p className="text-blue-600 mt-3">Out for delivery</p>
              ) : (
                <p className="text-yellow-600 mt-3">Pending delivery</p>
              )}
              {order.estimatedDeliveryDate && (
                <p className="text-sm text-gray-500 mt-2">Estimated delivery: {String(order.estimatedDeliveryDate).substring(0, 10)}</p>
              )}
            </div>

            {/* PAYMENT */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-bold flex gap-2 items-center">
                <FaCreditCard /> Payment
              </h2>

              <p className="mt-3">{order.paymentMethod}</p>

              {order.isPaid ? (
                <p className="text-green-600 mt-2">Paid</p>
              ) : (
                <p className="text-red-600 mt-2">Not Paid</p>
              )}
            </div>

            {/* ITEMS */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">

              <h2 className="font-black text-lg flex items-center gap-2 mb-5 text-slate-900 dark:text-white">
                <FaShoppingBag className="text-green-500" />
                Order Items
              </h2>

              <div className="space-y-4">

                {order.orderItems.map((item, i) => (

                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all"
                  >

                    {/* LEFT */}
                    <div className="flex items-center gap-4">

                      {/* IMAGE */}
                      <Link to={`/product/${item.product}`}>
                        <img
                          key={`order-img-${i}-${imageRefreshKey}`}
                          src={
                            item.image?.startsWith('http')
                              ? item.image
                              : `${BASE_URL}${item.image}`
                          }
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-slate-700 hover:scale-105 transition-transform"
                          onError={(e) => {
                            const url1 = item.image?.startsWith('http') ? item.image : `${getActiveBackendUrl()}${item.image}`;
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
                      </Link>

                      {/* INFO */}
                      <div className="space-y-1">

                        <Link
                          to={`/product/${item.product}`}
                          className="font-bold text-sm md:text-base text-slate-900 dark:text-white hover:text-green-500 transition-colors"
                        >
                          {item.name}
                        </Link>

                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                          Qty: {item.qty}
                        </p>

                        <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300">
                          ETB {item.price}
                        </p>

                        {/* STATUS */}
                        <div className="pt-1">

                          {order.refundStatus === 'requested' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                              <FaBoxOpen />
                              Refund Requested
                            </span>
                          ) : order.refundStatus === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-50 bg-teal-50 px-2 py-1 rounded-full">
                              <FaCheckCircle />
                              Refunded
                            </span>
                          ) : order.isDelivered ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              <FaCheckCircle />
                              Delivered
                            </span>
                          ) : order.isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                              <FaBoxOpen />
                              Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                              <FaTimesCircle />
                              Pending Payment
                            </span>
                          )}

                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total
                      </p>

                      <p className="font-black text-base md:text-lg text-green-600">
                        ETB {item.qty * item.price}
                      </p>
                    </div>

                  </div>
                ))}

              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white p-6 rounded-xl shadow h-fit">

            <h2 className="font-black text-lg mb-4">Summary</h2>

            <p>Total: {order.totalPrice}</p>

            {!order.isPaid && (
              <button
                onClick={successPaymentHandler}
                disabled={isProcessingPayment}
                className="w-full bg-green-500 text-white py-3 mt-5 rounded"
              >
                {isProcessingPayment ? 'Processing...' : 'Pay with Chapa'}
              </button>
            )}

            {order.isPaid && !order.isDelivered && (
              <button
                onClick={markDeliveredHandler}
                className="w-full bg-blue-600 text-white py-3 mt-5 rounded"
              >
                Mark Delivered
              </button>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
