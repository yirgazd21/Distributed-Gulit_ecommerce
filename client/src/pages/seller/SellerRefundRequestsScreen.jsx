import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUndoAlt,
  FaCheck,
  FaTimes,
  FaEye,
  FaExclamationTriangle,
} from 'react-icons/fa';
import {
  useGetSellerOrdersQuery,
  useCompleteSellerOrderRefundMutation,
  useRejectSellerOrderRefundMutation,
} from '../../store/slices/sellerProductsApiSlice';
import Loader from '../../components/Loader';

const criteriaLabel = (c) => {
  const map = {
    damaged_item: 'Damaged Item',
    wrong_product: 'Wrong Product',
    missing_items: 'Missing Items',
    product_not_working: 'Not Working',
    quality_issue: 'Quality Issue',
    delay_above_5_days: 'Delayed > 5 Days',
    other: 'Other',
  };
  return map[c] || c || '—';
};

const formatDate = (v) => (v ? String(v).substring(0, 10) : 'N/A');

const SellerRefundRequestsScreen = () => {
  const { data: allOrders = [], isLoading, error } = useGetSellerOrdersQuery(undefined, {
    pollingInterval: 30000,
  });

  const [completeRefund, { isLoading: completing }] = useCompleteSellerOrderRefundMutation();
  const [rejectRefund, { isLoading: rejecting }] = useRejectSellerOrderRefundMutation();

  const [rejectModal, setRejectModal] = useState(null); // orderId or null
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('requested'); // 'requested' | 'completed' | 'rejected'

  const requested = allOrders.filter((o) => o.refundStatus === 'requested');
  const completed = allOrders.filter((o) => o.refundStatus === 'completed');
  const rejected = allOrders.filter((o) => o.refundStatus === 'rejected');

  const tabOrders = activeTab === 'requested' ? requested : activeTab === 'completed' ? completed : rejected;

  const handleComplete = async (orderId) => {
    try {
      await completeRefund(orderId).unwrap();
      toast.success('Refund marked as completed');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to complete refund');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await rejectRefund({ orderId: rejectModal, reason: rejectReason }).unwrap();
      toast.success('Refund request rejected');
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject refund');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <FaUndoAlt className="text-amber-400" /> Refund Requests
        </h1>
        <p className="text-gray-400 mt-2">
          Review and respond to buyer refund requests for your orders.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'requested', label: 'Pending', count: requested.length, color: 'amber' },
          { key: 'completed', label: 'Completed', count: completed.length, color: 'green' },
          { key: 'rejected', label: 'Rejected', count: rejected.length, color: 'red' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors border ${
              activeTab === tab.key
                ? tab.color === 'amber'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : tab.color === 'green'
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === tab.key
                  ? tab.color === 'amber' ? 'bg-amber-500 text-white'
                  : tab.color === 'green' ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl font-bold">
          {error?.data?.message || 'Failed to load orders'}
        </div>
      ) : tabOrders.length === 0 ? (
        <div className="bg-[#1e293b] p-12 rounded-3xl border border-gray-700 text-center">
          <FaUndoAlt className="text-gray-600 text-5xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            No {activeTab === 'requested' ? 'pending' : activeTab} refund requests
          </h2>
          <p className="text-gray-400">
            {activeTab === 'requested'
              ? 'You have no pending refund requests right now.'
              : `No ${activeTab} refunds to show.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tabOrders.map((order) => (
            <div
              key={order._id}
              className="bg-[#1e293b] rounded-2xl border border-gray-700 p-6 shadow-lg"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                {/* ── Left: order info ── */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Order
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      #{String(order._id).slice(-10)}
                    </span>
                    {order.refundStatus === 'requested' && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-black text-amber-400">
                        <FaExclamationTriangle className="text-[10px]" /> Needs Review
                      </span>
                    )}
                    {order.refundStatus === 'completed' && (
                      <span className="flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-0.5 text-xs font-black text-teal-400">
                        <FaCheck className="text-[10px]" /> Refunded
                      </span>
                    )}
                    {order.refundStatus === 'rejected' && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-0.5 text-xs font-black text-red-400">
                        <FaTimes className="text-[10px]" /> Rejected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Customer</p>
                      <p className="text-white font-semibold">{order.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Order Total</p>
                      <p className="text-green-400 font-black">
                        ETB {Number(order.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Requested On</p>
                      <p className="text-white font-semibold">{formatDate(order.refundRequestedAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Reason</p>
                      <p className="text-amber-300 font-bold">{criteriaLabel(order.refundCriteria)}</p>
                    </div>
                  </div>

                  {order.refundReason && (
                    <div className="mt-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Buyer's note</p>
                      <p className="text-sm text-gray-200 italic">"{order.refundReason}"</p>
                    </div>
                  )}

                  {order.disputeNote && order.refundStatus !== 'requested' && (
                    <div className="mt-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Your response</p>
                      <p className="text-sm text-gray-200 italic">"{order.disputeNote}"</p>
                    </div>
                  )}
                </div>

                {/* ── Right: actions ── */}
                <div className="flex flex-col gap-2 min-w-[160px]">
                  <Link
                    to={`/seller/order/${order._id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white font-bold text-sm transition-colors"
                  >
                    <FaEye /> View Order
                  </Link>

                  {order.refundStatus === 'requested' && (
                    <>
                      <button
                        onClick={() => handleComplete(order._id)}
                        disabled={completing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-colors disabled:opacity-50"
                      >
                        <FaCheck /> Approve Refund
                      </button>
                      <button
                        onClick={() => { setRejectModal(order._id); setRejectReason(''); }}
                        disabled={rejecting}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <FaTimes /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1e293b] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <FaTimes className="text-red-400" /> Reject Refund Request
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Provide a reason so the buyer understands why their request was declined.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. The item was delivered in good condition and matches the listing..."
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRejectSubmit}
                disabled={rejecting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm transition-colors border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRefundRequestsScreen;
