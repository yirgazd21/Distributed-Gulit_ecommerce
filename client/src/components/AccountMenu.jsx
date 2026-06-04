import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useLogoutMutation } from '../store/slices/usersApiSlice';
import { logout } from '../store/slices/authSlice';
import { FaUserCircle, FaBox, FaSignOutAlt, FaChevronDown, FaUserCog, FaCreditCard, FaUndoAlt, FaTasks, FaHeart, FaHistory } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AccountMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [logoutApiCall] = useLogoutMutation();

  // 🚪 Logout Handler
  const logoutHandler = async () => {
    try {
      await logoutApiCall().unwrap(); // Tell server to clear cookie
      dispatch(logout()); // Clear local Redux state
      setIsOpen(false);
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (err) {
      console.error(err);
    }
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🟢 Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-gray-200"
      >
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
           {/* Initials of user */}
           <span className="font-black text-sm">{userInfo.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="hidden md:flex flex-col items-start leading-none">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Welcome</span>
          <span className="text-sm font-bold text-gray-700">{userInfo.name.split(' ')[0]}</span>
        </div>
        <FaChevronDown size={10} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 🔽 Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl shadow-gray-200 border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
          
          {/* Header inside dropdown */}
          <div className="px-4 py-3 border-b border-gray-50 mb-2">
            <p className="text-sm font-black text-gray-800">{userInfo.name}</p>
            <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
          </div>

          <Link 
            to="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaUserCog size={16} /> Profile & Settings
          </Link>

          <Link 
            to="/profile?tab=orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaBox size={16} /> My Orders
          </Link>

          <Link
            to="/profile?tab=payments"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaCreditCard size={16} /> Payments
          </Link>

          <Link
            to="/profile?tab=refunds"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaUndoAlt size={16} /> Refunds
          </Link>

          <Link
            to="/profile?tab=favorites"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaHeart size={16} /> Favorites
          </Link>

          <Link
            to="/profile?tab=browse-history"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaHistory size={16} /> History
          </Link>

          {/* Admin Dashboard Link (Only shows if admin) */}
          {userInfo.role === 'admin' && (
            <Link 
              to="/admin/dashboard" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <FaUserCircle size={16} /> Admin Dashboard
            </Link>
          )}

          <div className="border-t border-gray-50 mt-2 pt-2">
            <button 
              onClick={logoutHandler}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
            >
              <FaSignOutAlt size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
