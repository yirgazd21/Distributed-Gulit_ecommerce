import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const SellerRoute = () => {
  const { sellerInfo } = useSelector((state) => state.sellerAuth);

  // 1. Not logged in at all? Go to login.
  if (!sellerInfo) {
    return <Navigate to="/seller/login" replace />;
  }

  // 2. Logged in, but NOT approved? Go to the pending waiting room.
  if (!sellerInfo.isApproved) {
    return <Navigate to="/seller/pending" replace />;
  }

  // 3. Logged in AND approved? Let them into the dashboard!
  return <Outlet />;
};

export default SellerRoute;