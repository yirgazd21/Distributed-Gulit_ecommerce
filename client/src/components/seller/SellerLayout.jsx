import React from 'react';
import { Outlet } from 'react-router-dom';
import SellerHeader from './SellerHeader';
import SellerFooter from './SellerFooter';
import PlatformUpdatesBanner from '../PlatformUpdatesBanner';

const SellerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900 dark:bg-[#0f172a] dark:text-gray-300 font-sans w-full transition-colors">
      <SellerHeader />
      <main className="flex-grow pt-20"> {/* pt-20 pushes content below the fixed header */}
        <div className="w-full mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8 pt-3">
          <PlatformUpdatesBanner audience="seller" />
          <Outlet />
        </div>
      </main>
      <SellerFooter />
    </div>
  );
};

export default SellerLayout;
