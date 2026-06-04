import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaBars,
  FaBoxOpen,
  FaChartPie,
  FaClipboardList,
  FaCog,
  FaInbox,
  FaWallet,
  FaUndoAlt,
} from 'react-icons/fa';
import { useGetSellerOrdersQuery } from '../../store/slices/sellerProductsApiSlice';

const navItems = [
  { label: 'Dashboard Analytics', icon: FaChartPie, to: '/seller/dashboard' },
  { label: 'Products', icon: FaBoxOpen, to: '/seller/products' },
  { label: 'Orders', icon: FaClipboardList, to: '/seller/orders' },
  { label: 'Refund Requests', icon: FaUndoAlt, to: '/seller/refunds' },
  { label: 'Wallet', icon: FaWallet, to: '/seller/wallet' },
  { label: 'Inbox / Message', icon: FaInbox, to: '/seller/inbox' },
  { label: 'Shop Settings', icon: FaCog, to: '/seller/settings' },
];

const SellerSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { sellerInfo } = useSelector((state) => state.sellerAuth);

  const { data: sellerOrders = [] } = useGetSellerOrdersQuery(undefined, {
    skip: !sellerInfo,
    pollingInterval: 30000,
  });

  const pendingRefundCount = sellerOrders.filter(
    (o) => o.refundStatus === 'requested'
  ).length;

  return (
    <aside className={`hidden lg:block transition-all duration-200 ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="sticky top-28 rounded-2xl border border-white/10 bg-[#0b1220] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand seller sidebar' : 'Collapse seller sidebar'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-colors hover:bg-white/10"
          >
            <FaBars />
          </button>
          {!collapsed && (
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 font-bold">Seller Menu</p>
          )}
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
            const isRefundItem = item.to === '/seller/refunds';
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  isActive
                    ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200'
                    : 'border-transparent text-gray-300 hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <span className="relative">
                  <ItemIcon className="text-lg" />
                  {isRefundItem && pendingRefundCount > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-amber-500 px-1 text-[9px] font-black leading-none text-white flex items-center justify-center">
                      {pendingRefundCount}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span className="font-semibold flex-1 flex items-center justify-between">
                    {item.label}
                    {isRefundItem && pendingRefundCount > 0 && (
                      <span className="ml-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black text-amber-400">
                        {pendingRefundCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default SellerSidebar;
