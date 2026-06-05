import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import PlatformUpdatesBanner from './PlatformUpdatesBanner';


const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Header />
      <div className="w-full mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8 pt-3">
        <PlatformUpdatesBanner audience="buyer" />
      </div>
      
      {/* The Tibeb strip below the navbar */}
      <div className="h-1.5 bg-tibeb-pattern bg-repeat-x w-full"></div>

      <main className="flex-grow w-full mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <Outlet />
      </main>

      {/* Another Tibeb strip above the footer */}
      <div className="h-1.5 bg-tibeb-pattern bg-repeat-x w-full"></div>
      <Footer />
    </div>
  );
};

export default Layout;
