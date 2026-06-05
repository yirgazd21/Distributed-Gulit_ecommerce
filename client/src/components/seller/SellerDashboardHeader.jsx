import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { useSellerLogoutApiMutation } from '../../store/slices/sellersApiSlice';
import { useGetSellerOrdersQuery } from '../../store/slices/sellerProductsApiSlice';
import { logoutSeller } from '../../store/slices/sellerAuthSlice';

import {
  FaUserCircle,
  FaSignOutAlt,
  FaCaretDown,
  FaChartPie,
  FaBoxOpen,
  FaClipboardList,
  FaWallet,
  FaCog,
  FaInbox,
  FaBell,
  FaUndoAlt,
} from 'react-icons/fa';

import logo from '../../assets/gulit.png';
import ThemeToggle from '../ThemeToggle';

const SellerDashboardHeader = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  const { sellerInfo } = useSelector((state) => state.sellerAuth);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [logoutApiCall] = useSellerLogoutApiMutation();

  const { data: sellerOrders = [] } = useGetSellerOrdersQuery(undefined, {
    skip: !sellerInfo,
    pollingInterval: 30000,
  });

  // =========================================
  // BUYER-STYLE READ SYSTEM (FIXED)
  // =========================================
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem('sellerReadNotifications') || '[]')
      );
    } catch {
      return new Set();
    }
  });

  // =========================================
  // FILTER ORDERS
  // =========================================
  const pendingOrders = sellerOrders.filter(
    (order) =>
      order.isPaid &&
      !order.isDelivered &&
      (!order.refundStatus || order.refundStatus === 'none')
  );

  const refundRequests = sellerOrders.filter(
    (order) => order.refundStatus === 'requested'
  );

  // =========================================
  // NOTIFICATIONS
  // =========================================
  const notifications = useMemo(() => {
    const list = [
      ...refundRequests.map((order) => ({
        id: `refund-${order._id}`,
        icon: FaUndoAlt,
        title: 'Refund requested',
        description: `Order #${String(order._id).slice(-8)} needs review`,
        to: `/seller/refunds`,
        tone: 'text-amber-400',
        timestamp: order.updatedAt || order.createdAt,
      })),

      ...pendingOrders.map((order) => ({
        id: `order-${order._id}`,
        icon: FaClipboardList,
        title: 'New paid order',
        description: `Order #${String(order._id).slice(-8)} is ready to fulfill`,
        to: `/seller/order/${order._id}`,
        tone: 'text-green-400',
        timestamp: order.updatedAt || order.createdAt,
      })),
    ];

    return list
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);
  }, [pendingOrders, refundRequests]);

  // =========================================
  // UNREAD COUNT
  // =========================================
  const unreadCount = notifications.filter(
    (item) => !readIds.has(item.id)
  ).length;

  // =========================================
  // MARK AS READ
  // =========================================
  const markNotificationRead = (notificationId) => {
    setReadIds((prev) => {
      const next = new Set([...prev, notificationId]);

      localStorage.setItem(
        'sellerReadNotifications',
        JSON.stringify([...next])
      );

      return next;
    });
  };

  // =========================================
  // CLOSE OUTSIDE
  // =========================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================================
  // LOGOUT
  // =========================================
  const logoutHandler = async () => {
    try {
      await logoutApiCall().unwrap();

      dispatch(logoutSeller());

      navigate('/seller/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="fixed w-full z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-900/20 transition-colors">
      <div className="w-full px-3 sm:px-5 md:px-8 xl:px-12 h-16 sm:h-20 flex items-center justify-between gap-3">

        {/* =========================================
            LEFT SIDE
        ========================================= */}
        <div className="flex items-center gap-3 md:gap-8 xl:gap-12 min-w-0">

          <Link
            to="/seller/dashboard"
            className="flex items-center gap-2 sm:gap-3 group min-w-0"
          >
            <img
              src={logo}
              alt="Gulit Logo"
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
            />

            <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              Gulit{' '}
              <span className="text-green-500 font-medium">
                Workspace
              </span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-6 font-medium">
            <Link
              to="/seller/help-center"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors duration-300"
            >
              Help Center
            </Link>

            <Link
              to="/seller/rules-center"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors duration-300"
            >
              Rules Center
            </Link>

            <Link
              to="/seller/inbox"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors duration-300"
            >
              Inbox
            </Link>
          </div>
        </div>

        {/* =========================================
            RIGHT SIDE
        ========================================= */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5 xl:gap-6 flex-shrink-0">

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* =========================================
              NOTIFICATIONS
          ========================================= */}
          <div className="relative" ref={notificationsRef}>

            <button
              type="button"
              onClick={() =>
                setNotificationsOpen((prev) => !prev)
              }
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-slate-700 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-[#1e293b] dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label="Seller notifications"
            >
              <FaBell />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1e293b]">

                {/* HEADER */}
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

                {/* BODY */}
                <div className="max-h-96 overflow-y-auto py-2">

                  {notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No new order or refund alerts.
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
                            markNotificationRead(item.id);
                            setNotificationsOpen(false);
                          }}
                          className={`flex gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                            isRead ? 'opacity-60' : ''
                          }`}
                        >
                          <span className={`mt-1 ${item.tone}`}>
                            <ItemIcon />
                          </span>

                          <span>
                            <span className="block text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </span>

                            <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
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

          {/* =========================================
              PROFILE DROPDOWN
          ========================================= */}
          <div className="relative" ref={dropdownRef}>

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-slate-900 dark:text-white font-medium bg-gray-100 dark:bg-[#1e293b] hover:bg-gray-200 dark:hover:bg-gray-800 px-2.5 sm:px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-all focus:outline-none focus:border-green-500"
            >
              <FaUserCircle className="text-green-500 text-xl" />

              <span className="hidden sm:block max-w-[8rem] truncate">{sellerInfo?.shopName || 'My Store'}</span>

              <FaCaretDown
                className={`text-gray-400 transition-transform duration-300 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* DROPDOWN */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-1.5rem))] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-fade-in-up">

                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f172a]/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Signed in as
                  </p>

                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {sellerInfo?.email}
                  </p>
                </div>

                <div className="py-2 flex flex-col">

                  <Link
                    to="/seller/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaChartPie className="text-lg" />
                    Dashboard Analytics
                  </Link>

                  <Link
                    to="/seller/products"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaBoxOpen className="text-lg" />
                    Manage Products
                  </Link>

                  <Link
                    to="/seller/orders"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaClipboardList className="text-lg" />
                    Orders & Fulfillment
                  </Link>

                  <Link
                    to="/seller/wallet"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaWallet className="text-lg" />
                    Seller Wallet
                  </Link>

                  <Link
                    to="/seller/inbox"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaInbox className="text-lg" />
                    Support Inbox
                  </Link>

                  <Link
                    to="/seller/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <FaCog className="text-lg" />
                    Shop Settings
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* LOGOUT */}
          <button
            onClick={logoutHandler}
            className="hidden md:flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 font-bold px-5 py-2.5 rounded-xl transition-colors border border-red-500/20"
          >
            <FaSignOutAlt />
            Logout
          </button>

        </div>
      </div>
    </nav>
  );
};

export default SellerDashboardHeader;
