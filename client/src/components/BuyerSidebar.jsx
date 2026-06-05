import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBars,
  FaCog,
  FaHeart,
  FaHistory,
  FaHome,
  FaCreditCard,
  FaUndoAlt,
  FaShoppingCart,
  FaTasks,
  FaUser,
} from 'react-icons/fa';

const navItems = [
  { key: 'orders', label: 'Orders', icon: FaShoppingCart, to: '/profile?tab=orders' },
  { key: 'payments', label: 'Payments', icon: FaCreditCard, to: '/profile?tab=payments' },
  { key: 'refunds', label: 'Refunds', icon: FaUndoAlt, to: '/profile?tab=refunds' },
  { key: 'favorites', label: 'Favorites', icon: FaHeart, to: '/profile?tab=favorites' },
  { key: 'history', label: 'History', icon: FaHistory, to: '/profile?tab=browse-history' },
  {
    key: 'account-settings',
    label: 'Account Settings',
    icon: FaCog,
    subItems: [
      { key: 'profile', label: 'Profile', to: '/profile?tab=settings' },
      { key: 'address', label: 'Address', to: '/profile?tab=address' },
    ],
  },
];

const BuyerSidebar = ({ activeKey }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <aside className={`hidden md:block bg-white border border-white/10 rounded-2xl p-4 h-fit lg:sticky lg:top-24 transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-20' : 'w-56'}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-500 transition-colors hover:bg-white/10 cursor-pointer"
        >
          <FaBars />
        </button>
        {!collapsed && (
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-500 font-bold">Menu</p>
        )}
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeKey === item.key || 
            (item.key === 'history' && activeKey === 'browse-history');
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedSections[item.key];

          const baseClass = `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
            isActive
              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
              : 'border border-transparent text-gray-300'
          } ${collapsed ? 'justify-center' : ''}`;

          return (
            <div key={item.key}>
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.key)}
                  className={`${baseClass} ${isActive ? '' : 'hover:bg-white/3'}`}
                >
                  <ItemIcon className="text-lg text-black dark:text-white" />
                  {!collapsed && (
                    <>
                      <span className="font-semibold text-black dark:text-white">{item.label}</span>
                      <span className="ml-auto text-sm">{isExpanded ? '−' : '+'}</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to={item.to}
                  className={`${baseClass} ${isActive ? '' : 'hover:bg-white/3 '}`}
                >
                  <ItemIcon className="text-lg text-black dark:text-white" />
                  {!collapsed && <span className="font-semibold text-black dark:text-white">{item.label}</span>}
                </Link>
              )}

              {hasSubItems && isExpanded && !collapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const isSubActive = activeKey === subItem.key;
                    return (
                      <Link
                        key={subItem.key}
                        to={subItem.to}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                          isSubActive
                            ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-200'
                            : 'border border-transparent text-gray-400 hover:bg-white/2 hover:text-gray-300'
                        }`}
                      >
                        <span className="font-medium text-black dark:text-white">{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default BuyerSidebar;
