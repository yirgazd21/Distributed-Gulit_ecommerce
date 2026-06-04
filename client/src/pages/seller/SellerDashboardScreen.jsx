import React from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useGetSellerWalletQuery } from '../../store/slices/sellersApiSlice';
import { useGetSellerOrdersQuery } from '../../store/slices/sellerProductsApiSlice';

import {
  FaDollarSign,
  FaShoppingBag,
  FaBoxOpen,
  FaWallet,
  FaArrowRight,
  FaPlus,
  FaChartLine,
  FaEllipsisH,
} from 'react-icons/fa';

const SellerDashboardScreen = () => {
  const { sellerInfo } = useSelector((state) => state.sellerAuth);
  const navigate = useNavigate();

  const { data: walletData } = useGetSellerWalletQuery();

  // ✅ REAL ORDERS (NO MOCK)
  const { data: orders = [], isLoading: loadingOrders } =
    useGetSellerOrdersQuery();

  const walletBalance = Number(walletData?.walletBalance || 0);

  // ✅ Recent orders (latest 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="w-full animate-fade-in-up">

      {/* 🌟 Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">
            Welcome back,{' '}
            <span className="text-green-400">{sellerInfo?.shopName}</span>!
          </h1>
          <p className="text-gray-400 mt-1">
            Here is what's happening in your store today.
          </p>
        </div>

        <Link
          to="/seller/products/add"
          className="bg-green-500 hover:bg-green-400 text-[#0f172a] font-bold px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <FaPlus /> Add New Product
        </Link>
      </div>

      {/* 📊 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <FaDollarSign className="text-blue-400 text-2xl mb-2" />
          <h3 className="text-gray-400 text-sm">Total Sales</h3>
          <p className="text-2xl font-black text-white">24,500 ETB</p>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <FaShoppingBag className="text-purple-400 text-2xl mb-2" />
          <h3 className="text-gray-400 text-sm">Total Orders</h3>
          <p className="text-2xl font-black text-white">{orders.length}</p>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <FaBoxOpen className="text-orange-400 text-2xl mb-2" />
          <h3 className="text-gray-400 text-sm">Active Products</h3>
          <p className="text-2xl font-black text-white">45</p>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <FaWallet className="text-green-400 text-2xl mb-2" />
          <h3 className="text-gray-400 text-sm">Wallet Balance</h3>
          <p className="text-2xl font-black text-white">
            {walletBalance.toLocaleString()} ETB
          </p>
        </div>
      </div>

      {/* 📦 RECENT ORDERS */}
      <div className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden">

        <div className="p-6 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaShoppingBag className="text-green-500" /> Recent Orders
          </h2>

          <Link
            to="/seller/orders"
            className="text-green-400 font-bold flex items-center gap-1"
          >
            View All <FaArrowRight />
          </Link>
        </div>

        {/* loading */}
        {loadingOrders ? (
          <p className="p-6 text-gray-400">Loading orders...</p>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-sm">
                  <th className="p-4">Order</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => navigate(`/seller/order/${order._id}`)}
                    className="border-t border-gray-800 hover:bg-white/5 cursor-pointer"
                  >

                    <td className="p-4 text-white font-bold">
                      #{order._id.slice(-6)}
                    </td>

                    <td className="p-4 text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-gray-300">
                      {order.user?.name || 'User'}
                    </td>

                    <td className="p-4 text-white font-bold">
                      {order.totalPrice} ETB
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      {order.isDelivered ? (
                        <span className="text-green-400 text-xs font-bold">
                          Delivered
                        </span>
                      ) : order.isPaid ? (
                        <span className="text-amber-400 text-xs font-bold">
                          Processing
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs font-bold">
                          Pending
                        </span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* ⚡ QUICK ACTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-white font-bold mb-4">Quick Actions</h2>

          <Link to="/seller/products/add" className="block text-green-400 mb-2">
            Add Product
          </Link>

          <Link to="/seller/orders" className="block text-blue-400 mb-2">
            View Orders
          </Link>

          <Link to="/seller/wallet" className="block text-purple-400">
            Wallet
          </Link>
        </div>

      </div>
    </div>
  );
};

export default SellerDashboardScreen;