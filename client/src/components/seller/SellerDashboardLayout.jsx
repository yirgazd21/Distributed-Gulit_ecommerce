import React from 'react';
import { Outlet } from 'react-router-dom';
import SellerDashboardHeader from './SellerDashboardHeader';
import SellerFooter from './SellerFooter';
import PlatformUpdatesBanner from '../PlatformUpdatesBanner';
import SellerSidebar from './SellerSidebar';

const SellerDashboardLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900 dark:bg-[#0f172a] dark:text-gray-300 font-sans w-full transition-colors">
      <SellerDashboardHeader />
      
      {/* pt-28 gives breathing room below the fixed header for the workspace */}
      <main className="flex-grow pt-24 lg:pt-28 pb-10 sm:pb-12 w-full px-3 sm:px-6 lg:px-8"> 
        <div className="mx-auto flex w-full max-w-[96rem] gap-6">
          <SellerSidebar />
          <div className="min-w-0 flex-1">
            <PlatformUpdatesBanner audience="seller" />
            <Outlet />
          </div>
        </div>
      </main>
      
      <SellerFooter />
    </div>
  );
};

export default SellerDashboardLayout;
