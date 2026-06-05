import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logo from '../assets/gulit.png';
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import AccountMenu from './AccountMenu'; // 👈 Import the new component
import SearchBox from './SearchBox';
import SubHeader from './SubHeader';
import ThemeToggle from './ThemeToggle';
import BuyerNotifications from './BuyerNotifications';

const Header = () => {
  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.auth); // Get login state

  return (
    <header className="bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm border-b border-gray-100/80 dark:border-slate-800 transition-colors">
      {/* 🇪🇹 Top Cultural Ribbon */}
      <div className="h-1.5 bg-tibeb-pattern bg-repeat-x w-full border-b border-black/10 dark:border-white/10 opacity-80"></div>
      
      <div className="w-full mx-auto max-w-[1800px] py-2 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <img 
            src={logo} 
            alt="Gulit Logo" 
            className="h-12 sm:h-14 lg:h-16 w-auto transition-transform group-hover:scale-105 drop-shadow-sm flex-shrink-0" 
          />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xl sm:text-2xl font-black text-green-500 leading-none tracking-tight">GULIT</span>
            <span className="text-[10px] tracking-[0.2em] font-bold text-gray-400 dark:text-gray-500 uppercase">Modern Market</span>
          </div>
        </Link>

        {/* SEARCH BAR (Middle) */}
        <div className="grow max-w-lg mx-6 xl:mx-12 hidden md:block">
           <SearchBox /> 
        </div>

        {/* ICONS (Right) */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 flex-shrink-0">
           <ThemeToggle />
           <BuyerNotifications />
           <Link to="/cart" className="text-gray-600 dark:text-gray-200 hover:text-green-500 relative transition-colors">
              <FaShoppingCart className="text-[20px] sm:text-[24px]" />
              {cartItems.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {cartItems.reduce((a, c) => a + c.qty, 0)}
                 </span>
              )}
           </Link>
           
           {/* 👇 THE LOGIC SWITCH */}
           {userInfo ? (
             <AccountMenu /> // Show Dropdown if logged in
           ) : (
             <Link to="/login" className="flex items-center gap-2 text-gray-600 dark:text-gray-100 hover:text-green-500 font-bold transition-colors bg-gray-50 dark:bg-slate-800 px-3 sm:px-4 py-2 rounded-full border border-gray-100 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-400">
                <FaUser size={18} />
                <span className="hidden sm:inline">Login</span>
             </Link>
           )}
        </div>
      </div>
      <div className="w-full mx-auto max-w-[1800px] px-3 pb-3 sm:px-6 md:hidden">
        <SearchBox />
      </div>
      <SubHeader />
    </header>
  );
};

export default Header;
