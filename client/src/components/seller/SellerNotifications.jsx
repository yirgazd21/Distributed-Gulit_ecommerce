import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBell,
  FaClipboardList,
  FaUndoAlt,
} from 'react-icons/fa';

import { useSelector } from 'react-redux';
import { useGetSellerOrdersQuery } from '../../store/slices/sellerProductsApiSlice';

const SellerNotifications = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem('sellerReadNotifications') || '[]')
      );
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef(null);

  const { sellerInfo } = useSelector((state) => state.sellerAuth);

  const { data: sellerOrders = [] } = useGetSellerOrdersQuery(undefined, {
    skip: !sellerInfo,
    pollingInterval: 30000,
  });

  const pendingOrders = sellerOrders.filter(
    (order) =>
      order.isPaid &&
      !order.isDelivered &&
      (!order.refundStatus || order.refundStatus === 'none')
  );

  const refundRequests = sellerOrders.filter(
    (order) => order.refundStatus === 'requested'
  );

  const notifications = useMemo(() => {
    return [
      ...refundRequests.map((order) => ({
        id: `refund-${order._id}`,
        icon: FaUndoAlt,
        title: 'Refund requested',
        description: `Order #${String(order._id).slice(-8)} needs review`,
        to: `/seller/order/${order._id}`,
        tone: 'text-amber-400',
      })),

      ...pendingOrders.map((order) => ({
        id: `order-${order._id}`,
        icon: FaClipboardList,
        title: 'New paid order',
        description: `Order #${String(order._id).slice(-8)} is ready to fulfill`,
        to: `/seller/order/${order._id}`,
        tone: 'text-green-400',
      })),
    ].slice(0, 8);
  }, [pendingOrders, refundRequests]);

  const unreadCount = notifications.filter(
    (item) => !readIds.has(item.id)
  ).length;

  const markAsRead = (id) => {
    setReadIds((prev) => {
      const next = new Set([...prev, id]);

      localStorage.setItem(
        'sellerReadNotifications',
        JSON.stringify([...next])
      );

      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!sellerInfo) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-slate-700 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-[#1e293b] dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <FaBell />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1e293b]">

          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Notifications
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Orders and refund activity
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-bold text-red-500">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto py-2">

            {notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((item) => {
                const ItemIcon = item.icon;

                const isRead = readIds.has(item.id);

                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={() => {
                      markAsRead(item.id);
                      setIsOpen(false);
                    }}
                    className={`flex gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                      isRead ? 'opacity-50' : ''
                    }`}
                  >
                    <span className={`mt-1 ${item.tone}`}>
                      <ItemIcon />
                    </span>

                    <span>
                      <span className="block text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </span>

                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerNotifications;