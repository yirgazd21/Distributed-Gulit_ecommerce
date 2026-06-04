import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaUser, FaMapMarkerAlt, FaSpinner, FaUndoAlt } from 'react-icons/fa';
import { useGetSellerOrderDetailsQuery, useDeliverSellerOrderMutation, useUpdateSellerOrderStatusMutation, useCompleteSellerOrderRefundMutation, useRejectSellerOrderRefundMutation } from '../../store/slices/sellerProductsApiSlice';
import Loader from '../../components/Loader';
import { BASE_URL } from '../../store/slices/apiSlice';

const SellerOrderDetailsScreen = () => {
  const { id: orderId } = useParams();
  const [refundRejectReason, setRefundRejectReason] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('pending');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  const { sellerInfo } = useSelector((state) => state.sellerAuth);
  const { data: order, isLoading, error, refetch } = useGetSellerOrderDetailsQuery(orderId);
  const [deliverOrder, { isLoading: loadingDeliver }] = useDeliverSellerOrderMutation();
  const [updateStatus, { isLoading: loadingStatusUpdate }] = useUpdateSellerOrderStatusMutation();
  const [completeRefund, { isLoading: loadingRefund }] = useCompleteSellerOrderRefundMutation();
  const [rejectRefund, { isLoading: loadingRejectRefund }] = useRejectSellerOrderRefundMutation();
  const formatDate = (value) => (value ? String(value).substring(0, 10) : 'N/A');
  const criteriaLabel = (c) => {
    if (!c) return '';
    const map = {
      damaged_item: 'Damaged item',
      wrong_product: 'Wrong product',
      missing_items: 'Missing items',
      product_not_working: 'Product not working',
      quality_issue: 'Quality issue',
      delay_above_5_days: 'Delayed > 5 days',
      other: 'Other',
    };
    return map[c] || c;
  };

  useEffect(() => {
    if (order) {
      setDeliveryStatus(order.deliveryStatus || (order.isDelivered ? 'delivered' : 'pending'));
      setEstimatedDeliveryDate(order.estimatedDeliveryDate ? String(order.estimatedDeliveryDate).substring(0, 10) : '');
    }
  }, [order]);

  const sellerRefundItems = (order?.orderItems || []).filter((item) => {
    if (!sellerInfo?._id) return true;
    return String(item.seller) === String(sellerInfo._id);
  });

  const deliverHandler = async () => {
    try {
      await deliverOrder(orderId);
      refetch(); // Refresh the page data
      toast.success('Order marked as delivered!');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const completeRefundHandler = async () => {
    try {
      await completeRefund(orderId).unwrap();
      refetch();
      toast.success('Refund completed successfully');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to complete refund');
    }
  };

  const updateStatusHandler = async () => {
    try {
      await updateStatus({ orderId, deliveryStatus, estimatedDeliveryDate: estimatedDeliveryDate || undefined }).unwrap();
      refetch();
      toast.success('Delivery status updated successfully');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update status');
    }
  };

  const rejectRefundHandler = async () => {
    try {
      await rejectRefund({
        orderId,
        reason: refundRejectReason.trim() || 'Refund request rejected by seller',
      }).unwrap();
      refetch();
      toast.success('Refund request rejected');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to reject refund');
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 text-center font-bold p-10">{error?.data?.message || error.error}</div>;
  if (!order) return <div className="text-gray-400 text-center font-bold p-10">Order data is unavailable.</div>;

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up pb-20">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
           <FaBox className="text-blue-500" /> Order Details
        </h1>
        <div className="text-gray-400 font-medium">Order ID: <span className="text-white font-bold">{order._id}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Customer, Shipping, Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer & Shipping Info */}
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-700 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                <FaUser className="text-blue-500" /> Customer Info
              </h2>
              <p className="text-gray-300 font-medium">{order.user?.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                <a href={`mailto:${order.user?.email}`} className="hover:text-blue-400">{order.user?.email}</a>
              </p>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                <FaMapMarkerAlt className="text-green-500" /> Shipping Address
              </h2>
              <p className="text-gray-300 font-medium">{order.shippingAddress?.address || 'N/A'}</p>
              <p className="text-gray-400 text-sm mt-1">
                {order.shippingAddress?.city || 'N/A'}, {order.shippingAddress?.postalCode || 'N/A'}, {order.shippingAddress?.country || 'N/A'}
              </p>
            </div>
          </div>

          {/* Status Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border ${order.isPaid ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
               <h3 className="font-bold flex items-center gap-2 mb-1">
                 {order.isPaid ? <FaCheckCircle /> : <FaTimesCircle />} Payment Status
               </h3>
               <p className="text-sm font-medium">{order.isPaid ? `Paid on ${formatDate(order.paidAt)}` : 'Not Paid'}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${order.refundStatus === 'completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' : order.deliveryStatus === 'delivered' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
               <h3 className="font-bold flex items-center gap-2 mb-1">
                 {order.refundStatus === 'completed' || order.deliveryStatus === 'delivered' ? <FaCheckCircle /> : <FaTimesCircle />} Delivery Status
               </h3>
               <p className="text-sm font-medium">
                 {order.refundStatus === 'completed'
                   ? 'Refunded'
                   : order.deliveryStatus === 'delivered'
                     ? `Delivered on ${formatDate(order.deliveredAt)}`
                     : order.deliveryStatus === 'preparing'
                       ? 'Preparing'
                       : order.deliveryStatus === 'out_for_delivery'
                         ? 'Out for delivery'
                         : 'Pending Delivery'}
               </p>
            </div>
            <div className="p-4 rounded-2xl border bg-gray-300 border-gray-700 text-gray-200 dark:bg-black">
              <h3 className="font-bold flex items-center gap-2 mb-1 text-black dark:text-gray-300">
                <FaTruck /> Estimated Delivery
              </h3>
              <p className="text-sm font-medium">{order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : 'TBD'}</p>
            </div>
          </div>

          {order.refundStatus && order.refundStatus !== 'none' && (
            <div className={`p-4 rounded-2xl border ${
              order.refundStatus === 'completed'
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                : order.refundStatus === 'rejected'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <h3 className="font-bold flex items-center gap-2 mb-1">
                <FaUndoAlt /> Refund Status
              </h3>
              <p className="text-sm font-medium">
                {order.refundStatus === 'completed'
                  ? `Completed on ${formatDate(order.refundedAt)}${order.refundAmount ? ` for ${Number(order.refundAmount).toLocaleString()} ETB` : ''}`
                  : order.refundStatus === 'rejected'
                    ? 'Rejected'
                    : `Requested on ${formatDate(order.refundRequestedAt)}`}
              </p>
              {order.refundReason && <p className="text-xs mt-2 opacity-80">{order.refundReason}</p>}
              {order.refundCriteria && (
                <p className="text-sm mt-2 opacity-80">Cause: <span className="font-semibold text-white">{criteriaLabel(order.refundCriteria)}</span></p>
              )}
            </div>
          )}

          {/* Ordered Items */}
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-4">Ordered Items</h2>
            <div className="space-y-4">
              {(order.orderItems || []).map((item, index) => (
                <div key={index} className="flex items-center gap-4 border-gray-200  p-4 rounded-2xl border border-gray-700/50">
                  <img src={`${BASE_URL}${item.image}`} alt={item.name} className="w-16 h-16 object-contain  border-gray-200 rounded-xl  border-gray-200" />
                  <div className="grow">
                    <Link to={`/product/${item.product}`} className="text-white font-bold hover:text-blue-400 transition-colors line-clamp-1">
                      {item.name}
                    </Link>
                    <div className="text-sm text-gray-400 mt-1">
                      {item.qty} x {Number(item.price || 0).toLocaleString()} ETB
                    </div>
                  </div>
                  <div className="text-lg font-black text-green-400 whitespace-nowrap">
                    {Number((item.qty || 0) * (item.price || 0)).toLocaleString()} ETB
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary & Actions */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-4">Order Summary</h2>
            
            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between items-center text-gray-400">
                <span>Delivery Status:</span>
                <span className="text-white font-medium capitalize">
                  {order.deliveryStatus === 'out_for_delivery' ? 'Out for delivery' : order.deliveryStatus || (order.isDelivered ? 'delivered' : 'pending')}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Estimated Delivery:</span>
                <span className="text-white font-medium">{order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Items Total:</span>
                <span className="text-white font-medium">{Number(order.itemsPrice || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Shipping:</span>
                <span className="text-white font-medium">{Number(order.shippingPrice || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Tax:</span>
                <span className="text-white font-medium">{Number(order.taxPrice || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <span className="text-lg font-bold text-white">Grand Total:</span>
                <span className="text-2xl font-black text-green-400">{Number(order.totalPrice || 0).toLocaleString()} ETB</span>
              </div>
            </div>

            {/* ONLY show the deliver button if the order is paid AND not yet delivered */}
            {!order.isDelivered && order.refundStatus !== 'completed' && order.refundStatus !== 'requested' && (
              <button
                type="button"
                className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                  order.isPaid 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                onClick={deliverHandler}
                disabled={!order.isPaid || loadingDeliver}
                title={!order.isPaid ? 'Customer must pay before delivery' : 'Mark as Delivered'}
              >
                {loadingDeliver ? <FaSpinner className="animate-spin" /> : <><FaTruck /> Mark As Delivered</>}
              </button>
            )}
            
            {!order.isPaid && !order.isDelivered && (
               <p className="text-xs text-red-400 text-center mt-3">
                 Waiting for customer payment before shipping is allowed.
               </p>
            )}

            <div className="bg-[#0f172a] p-5 rounded-3xl border border-gray-700/50 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Update Delivery Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={updateStatusHandler}
                  disabled={loadingStatusUpdate || order.refundStatus === 'completed'}
                  className="w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-60"
                >
                  {loadingStatusUpdate ? <FaSpinner className="animate-spin" /> : 'Update Delivery Status'}
                </button>
              </div>
            </div>

            {order.refundStatus === 'requested' && (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={completeRefundHandler}
                  disabled={loadingRefund || loadingRejectRefund}
                  className="w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-60"
                >
                  {loadingRefund ? <FaSpinner className="animate-spin" /> : <><FaUndoAlt /> Approve Refund</>}
                </button>
                <textarea
                  rows={2}
                  value={refundRejectReason}
                  onChange={(e) => setRefundRejectReason(e.target.value)}
                  placeholder="Optional rejection reason"
                  className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-3 py-3 text-sm text-white outline-none focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={rejectRefundHandler}
                  disabled={loadingRefund || loadingRejectRefund}
                  className="w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-60"
                >
                  {loadingRejectRefund ? <FaSpinner className="animate-spin" /> : 'Reject Refund'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerOrderDetailsScreen;
