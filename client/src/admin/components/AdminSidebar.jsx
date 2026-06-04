import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBars,
  FaCog,
  FaGavel,
  FaHome,
  FaLifeRing,
  FaMoneyCheckAlt,
  FaUserCheck,
  FaUsers,
} from 'react-icons/fa';
import logo from '../../assets/gulit.png';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: FaHome, to: '/admin/dashboard' },
  { key: 'seller-review', label: 'Seller Review', icon: FaUserCheck, to: '/admin/sellers' },
  { key: 'user-management', label: 'User Management', icon: FaUsers, to: '/admin/users' },
  { key: 'orders-disputes', label: 'Orders & Disputes', icon: FaGavel, to: '/admin/disputes' },
  { key: 'finance', label: 'Finance', icon: FaMoneyCheckAlt, to: '/admin/finance' },
  { key: 'support', label: 'Support Inbox', icon: FaLifeRing, to: '/admin/support' },
  { key: 'system-settings', label: 'System Settings', icon: FaCog, to: '/admin/settings' },
];

const AdminSidebar = ({ activeKey }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`bg-[#0f172a] border border-white/10 rounded-2xl p-4 h-fit lg:sticky lg:top-24 transition-all duration-200 ${collapsed ? 'w-20' : 'w-full'}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-colors hover:bg-white/10"
        >
          <FaBars />
        </button>
        {!collapsed && (
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 font-bold">Menu</p>
        )}
      </div>

      <div className={`flex items-center justify-center mb-4 py-2 transition-all duration-200 ${collapsed ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : ''}`}>
        <img src={logo} alt="Gulit" className="w-40 h-40 object-contain" />
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeKey === item.key;
          const baseClass = `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
            isActive
              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
              : 'border border-transparent text-gray-300'
          } ${collapsed ? 'justify-center' : ''}`;

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`${baseClass} ${isActive ? '' : 'hover:bg-white/[0.03]'}`}
            >
              <ItemIcon className="text-lg" />
              {!collapsed && <span className="font-semibold">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
