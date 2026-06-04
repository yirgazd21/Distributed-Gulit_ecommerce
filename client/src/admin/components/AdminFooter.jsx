import React from 'react';
import logo from '../../assets/gulit.png';

const AdminFooter = () => {
  return (
    <footer className="border-t border-cyan-500/20 bg-[#081122] mt-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src={logo} alt="Gulit" className="w-10 h-10 object-contain" />
              <p className="font-black text-gray-100">Gulit Admin</p>
            </div>
            <p className="text-sm text-gray-400">Central operations for marketplace governance and platform reliability.</p>
          </div>
          <div>
            <p className="font-bold text-gray-200 mb-2">Operations</p>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>Seller verification</li>
              <li>Financial oversight</li>
              <li>Support management</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-gray-200 mb-2">System</p>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>Environment: Production-like</li>
              <li>Security checks: Enabled</li>
              <li>Updated: {new Date().toLocaleString()}</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Gulit Marketplace. All rights reserved.</p>
          <p>Admin Operations Console</p>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;
