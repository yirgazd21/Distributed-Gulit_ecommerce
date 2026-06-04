import React from 'react';
import { Link } from 'react-router-dom';

const SellerFooter = () => {
  return (
    <footer className="bg-gray-100 dark:bg-[#0f172a] border-t border-gray-300 dark:border-gray-800 py-12 mt-auto relative z-10 transition-colors">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="text-center md:text-left">
          <Link to="/sell" className="flex items-center gap-2 justify-center md:justify-start mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-black text-sm">G</div>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Gulit <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Seller Center</span>
            </span>
          </Link>
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Gulit Marketplace. All rights reserved.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
          <Link to="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Help Center</Link>
          <Link to="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Terms of Service</Link>
          <Link to="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Seller Agreement</Link>
        </div>

      </div>
    </footer>
  );
};

export default SellerFooter;
