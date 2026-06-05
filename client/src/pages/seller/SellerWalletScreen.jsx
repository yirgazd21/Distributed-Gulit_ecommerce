import React from 'react';
import { Link } from 'react-router-dom';
import { FaWallet, FaArrowLeft, FaMoneyBillWave } from 'react-icons/fa';
import { useGetSellerWalletQuery } from '../../store/slices/sellersApiSlice';
import Loader from '../../components/Loader';

const SellerWalletScreen = () => {
  const { data, isLoading, error } = useGetSellerWalletQuery();

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 font-bold p-6">{error?.data?.message || error.error}</div>;

  const walletBalance = Number(data?.walletBalance || 0);
  const transactions = [...(data?.transactions || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">
      <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-700 shadow-xl mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 mb-4">
          <FaWallet className="text-green-400" /> Seller Wallet
        </h1>
        <p className="text-gray-400 mb-2">Available Balance</p>
        <p className="text-4xl font-black text-green-400">
          {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
        </p>
      </div>

      <div className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaMoneyBillWave className="text-blue-400" /> Recent Transactions
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-gray-400">No wallet transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-gray-700 text-xs uppercase tracking-widest text-gray-400 font-black">
                  <th className="p-4">Date</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {transactions.map((tx) => {
                  const isDebit = tx.type === 'DEBIT';
                  return (
                    <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-gray-300">{String(tx.createdAt || '').substring(0, 10) || 'N/A'}</td>
                      <td className="p-4 text-sm text-gray-300">{tx.order?._id ? `...${String(tx.order._id).slice(-6)}` : 'N/A'}</td>
                      <td className={`p-4 text-sm font-bold ${isDebit ? 'text-amber-400' : 'text-blue-400'}`}>{tx.type}</td>
                      <td className={`p-4 text-sm font-black ${isDebit ? 'text-amber-400' : 'text-green-400'}`}>
                        {isDebit ? '-' : '+'}{Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerWalletScreen;
