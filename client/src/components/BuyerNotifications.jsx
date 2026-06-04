import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaBoxOpen, FaBullhorn, FaTimes, FaUndoAlt } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useGetMyOrdersQuery } from '../store/slices/ordersApiSlice';
import { useGetPlatformUpdatesQuery } from '../store/slices/platformApiSlice';
import RichTextMessage from './RichTextMessage';

// ─── Platform Update Detail Modal ────────────────────────────────────────────
const UpdateModal = ({ update, onClose }) => {
  if (!update) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <FaTimes size={14} />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white">
            <FaBullhorn size={13} />
          </span>
          <span className="text-xs uppercase tracking-widest font-black text-emerald-600">Platform Update</span>
        </div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">{update.title}</h2>
        <RichTextMessage
          text={update.message}
          className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
        />
        <p className="mt-4 text-xs text-gray-400">
          {update.createdAt ? new Date(update.createdAt).toLocaleDateString() : ''}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BuyerNotifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('buyerReadNotifications') || '[]'));
    } catch {
      return new Set();
    }
  });
  const dropdownRef = useRef(null);
  const { userInfo } = useSelector((state) => state.auth);
  const { data: orders = [] } = useGetMyOrdersQuery(undefined, {
    skip: !userInfo,
    pollingInterval: 30000,
  });
  const { data: updatesData } = useGetPlatformUpdatesQuery({ audience: 'buyer' }, { skip: !userInfo });

  // Keep the raw update objects so we can show them in the modal
  const rawUpdates = updatesData?.updates || [];

  const notifications = useMemo(() => {
    const orderUpdates = orders.flatMap((order) => {
      const items = [];
      if (order.isDelivered) {
        items.push({
          id: `delivered-${order._id}`,
          icon: FaBoxOpen,
          title: 'Order delivered',
          description: `Order #${String(order._id).slice(-8)} is marked delivered`,
          to: `/order/${order._id}`,
          tone: 'text-blue-500',
          timestamp: order.deliveredAt || order.updatedAt || order.createdAt,
          type: 'order',
        });
      }
      if (order.refundStatus === 'completed') {
        items.push({
          id: `refund-completed-${order._id}`,
          icon: FaUndoAlt,
          title: 'Refund accepted',
          description: `Refund completed for order #${String(order._id).slice(-8)}`,
          to: '/profile?tab=refunds',
          tone: 'text-green-500',
          timestamp: order.refundedAt || order.updatedAt || order.createdAt,
          type: 'order',
        });
      }
      if (order.refundStatus === 'rejected') {
        items.push({
          id: `refund-rejected-${order._id}`,
          icon: FaUndoAlt,
          title: 'Refund rejected',
          description: `Seller responded to order #${String(order._id).slice(-8)}`,
          to: '/profile?tab=refunds',
          tone: 'text-red-500',
          timestamp: order.refundedAt || order.updatedAt || order.createdAt,
          type: 'order',
        });
      }
      return items;
    });

    const platformUpdates = rawUpdates.slice(0, 3).map((update) => ({
      id: `update-${update._id}`,
      updateId: update._id,   // keep reference to open modal
      icon: FaBullhorn,
      title: update.title || 'New update',
      description: update.message || 'There is a new platform update',
      tone: 'text-emerald-500',
      timestamp: update.createdAt,
      type: 'platform',
    }));

    return [...orderUpdates, ...platformUpdates]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);
  }, [orders, rawUpdates]);

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  const markNotificationRead = (notificationId) => {
    setReadIds((prev) => {
      const next = new Set([...prev, notificationId]);
      localStorage.setItem('buyerReadNotifications', JSON.stringify([...next]));
      return next;
    });
  };

  const handleNotificationClick = (item) => {
    markNotificationRead(item.id);
    if (item.type === 'platform') {
      // Find the full update object and show modal
      const update = rawUpdates.find((u) => u._id === item.updateId);
      if (update) {
        setSelectedUpdate(update);
        setIsOpen(false);
        return;
      }
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userInfo) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Notifications"
          className="relative text-gray-600 dark:text-gray-200 hover:text-green-500 transition-colors"
        >
          <FaBell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-black text-gray-900 dark:text-white">Notifications</p>
              <p className="text-xs text-gray-500">Delivery, refund, and update messages</p>
            </div>
            <div className="max-h-96 overflow-y-auto py-2">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">No new updates.</div>
              ) : (
                notifications.map((item) => {
                  const ItemIcon = item.icon;
                  const isRead = readIds.has(item.id);

                  // Platform updates → button that opens modal
                  if (item.type === 'platform') {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${isRead ? 'opacity-60' : ''}`}
                      >
                        <span className={`mt-1 shrink-0 ${item.tone}`}>
                          <ItemIcon />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-gray-900 dark:text-white">{item.title}</span>
                          <span className="block text-xs text-gray-500 line-clamp-2">{item.description}</span>
                        </span>
                      </button>
                    );
                  }

                  // Order updates → Link as before
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => handleNotificationClick(item)}
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${isRead ? 'opacity-60' : ''}`}
                    >
                      <span className={`mt-1 shrink-0 ${item.tone}`}>
                        <ItemIcon />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">{item.title}</span>
                        <span className="block text-xs text-gray-500 line-clamp-2">{item.description}</span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Platform update detail modal */}
      <UpdateModal update={selectedUpdate} onClose={() => setSelectedUpdate(null)} />
    </>
  );
};

export default BuyerNotifications;
