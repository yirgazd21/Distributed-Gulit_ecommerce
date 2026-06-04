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

const SellerHeader = () => {
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

  // =====================================
  // READ NOTIFICATION STATE
  // =====================================
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem('sellerReadNotifications') || '[]')
      );
    } catch {
      return new Set();
    }
  });

  // =====================================
  // ORDERS
  // =====================================
  const pendingOrders = sellerOrders.filter(
    (o) =>
      o.isPaid &&
      !o.isDelivered &&
      (!o.refundStatus || o.refundStatus === 'none')
  );

  const refundRequests = sellerOrders.filter(
    (o) => o.refundStatus === 'requested'
  );

  // =====================================
  // NOTIFICATIONS
  // =====================================
  const notifications = useMemo(() => {
    return [
      ...refundRequests.map((o) => ({
        id: `refund-${o._id}`,
        icon: FaUndoAlt,
        title: 'Refund requested',
        description: `Order #${String(o._id).slice(-8)} needs review`,
        to: `/seller/order/${o._id}`,
        tone: 'text-amber-400',
      })),

      ...pendingOrders.map((o) => ({
        id: `order-${o._id}`,
        icon: FaClipboardList,
        title: 'New paid order',
        description: `Order #${String(o._id).slice(-8)} is ready`,
        to: `/seller/order/${o._id}`,
        tone: 'text-green-400',
      })),
    ].slice(0, 8);
  }, [pendingOrders, refundRequests]);

  // =====================================
  // UNREAD COUNT
  // =====================================
  const unreadCount = notifications.filter(
    (n) => !readIds.has(n.id)
  ).length;

  // =====================================
  // MARK READ
  // =====================================
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

  // =====================================
  // CLOSE OUTSIDE
  // =====================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =====================================
  // LOGOUT
  // =====================================
  const logoutHandler = async () => {
    try {
      await logoutApiCall().unwrap();
      dispatch(logoutSeller());
      navigate('/seller/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (!sellerInfo) return null;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
      
      <div className="w-full h-16 md:h-18 px-3 sm:px-5 md:px-10 flex items-center justify-between">

        {/* =====================================
            LEFT SIDE
        ===================================== */}
        <div className="flex items-center gap-3 md:gap-8 min-w-0">

          {/* LOGO */}
          <Link
            to="/seller/dashboard"
            className="flex items-center gap-2 min-w-0"
          >
            <img
              src={logo}
              alt="logo"
              className="w-9 h-9 md:w-11 md:h-11 object-contain"
            />

            <span className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">
              Gulit{' '}
              <span className="text-green-500 font-semibold">
                Seller
              </span>
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden lg:flex items-center gap-5 text-[13px] font-medium">
            <Link
              to="/seller/help-center"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 transition"
            >
              Help Center
            </Link>

            <Link
              to="/seller/rules-center"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 transition"
            >
              Rules
            </Link>

            <Link
              to="/seller/inbox"
              className="text-gray-600 dark:text-gray-400 hover:text-green-500 transition"
            >
              Inbox
            </Link>
          </div>
        </div>

        {/* =====================================
            RIGHT SIDE
        ===================================== */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">

          {/* THEME */}
          <div className="scale-90 md:scale-100">
            <ThemeToggle />
          </div>

          {/* =====================================
              NOTIFICATIONS
          ===================================== */}
          <div ref={notificationsRef} className="relative">

            <button
              onClick={() =>
                setNotificationsOpen(!notificationsOpen)
              }
              className="relative flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-xl border border-gray-200 bg-gray-100 text-slate-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-[#1e293b] dark:text-gray-200 dark:hover:bg-gray-800 transition"
            >
              <FaBell className="text-sm md:text-base" />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 md:min-w-5 rounded-full bg-red-500 px-1 py-[1px] text-[9px] md:text-[10px] font-bold text-white text-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* DROPDOWN */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-[290px] sm:w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1e293b]">

                {/* HEADER */}
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                    Notifications
                  </p>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Orders & refunds
                  </p>
                </div>

                {/* BODY */}
                <div className="max-h-80 overflow-y-auto py-1">

                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = n.icon;
                      const isRead = readIds.has(n.id);

                      return (
                        <Link
                          key={n.id}
                          to={n.to}
                          onClick={() => {
                            markAsRead(n.id);
                            setNotificationsOpen(false);
                          }}
                          className={`flex gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                            isRead ? 'opacity-50' : ''
                          }`}
                        >
                          <span className={`mt-1 ${n.tone}`}>
                            <Icon className="text-sm" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {n.title}
                            </p>

                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                              {n.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =====================================
              PROFILE DROPDOWN
          ===================================== */}
          <div ref={dropdownRef} className="relative">

            <button
              onClick={() =>
                setDropdownOpen(!dropdownOpen)
              }
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-2.5 py-2 text-xs md:text-sm font-medium text-slate-900 hover:bg-gray-200 dark:border-gray-700 dark:bg-[#1e293b] dark:text-white dark:hover:bg-gray-800 transition"
            >
              <FaUserCircle className="text-green-500 text-base md:text-lg" />

              <span className="hidden sm:block max-w-[90px] md:max-w-[120px] truncate">
                {sellerInfo.shopName}
              </span>

              <FaCaretDown
                className={`text-gray-400 transition-transform duration-300 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* MENU */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1e293b]">

                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Signed in as
                  </p>

                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {sellerInfo.email}
                  </p>
                </div>

                <div className="py-1">

                  <Link
                    to="/seller/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaChartPie />
                    Dashboard
                  </Link>

                  <Link
                    to="/seller/products"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaBoxOpen />
                    Products
                  </Link>

                  <Link
                    to="/seller/orders"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaClipboardList />
                    Orders
                  </Link>

                  <Link
                    to="/seller/wallet"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaWallet />
                    Wallet
                  </Link>

                  <Link
                    to="/seller/inbox"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaInbox />
                    Inbox
                  </Link>

                  <Link
                    to="/seller/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <FaCog />
                    Settings
                  </Link>

                  <button
                    onClick={logoutHandler}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs md:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>

                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default SellerHeader;