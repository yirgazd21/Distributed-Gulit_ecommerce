import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFileDownload,
  FaMoneyCheckAlt,
  FaSearchDollar,
  FaSignOutAlt,
  FaSync,
  FaWallet,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import { useAdminExportFinanceReportMutation, useAdminGetFinanceOverviewQuery } from '../slices/adminApiSlice';

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const intFormat = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));

const AdminFinanceScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');

  const { data, isLoading, isError, isFetching, refetch } = useAdminGetFinanceOverviewQuery({ page, limit, keyword });
  const [exportFinanceReport, { isLoading: exportingFinance }] = useAdminExportFinanceReportMutation();

  const summary = data?.summary || {};
  const trend = data?.trend30d || {};
  const transactions = data?.transactions || [];
  const pages = data?.pages || 1;

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const searchHandler = (e) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
  };

  const handleFinanceExport = async (range) => {
    try {
      const csvText = await exportFinanceReport({ range }).unwrap();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `finance-report-${range}-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Finance report exported (${range})`);
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to export finance report');
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-white flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#081122]/95 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400/15 via-white/5 to-blue-500/15 border border-cyan-400/30 shadow-[0_10px_30px_rgba(56,189,248,0.25)] flex items-center justify-center">
              <img src={logo} alt="Gulit" className="w-20 h-20 object-contain drop-shadow-[0_6px_20px_rgba(34,211,238,0.45)]" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-300 font-bold">Gulit Admin</p>
              <p className="text-lg font-black text-gray-100">Finance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={logoutHandler}
              className="inline-flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-200 font-bold px-4 py-2.5 rounded-xl border border-red-500/30 transition-colors"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(80px,280px)_1fr] gap-6">
          <AdminSidebar activeKey="finance" />
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <FaMoneyCheckAlt className="text-cyan-300" /> Finance Command
              </h1>
              <p className="text-gray-300 mt-2">Monitor platform earnings, seller settlements, and financial risk from one ledger.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs text-emerald-200 uppercase tracking-wide">Platform Income</p>
                <p className="text-2xl font-black text-cyan-300 mt-1">{currency(summary.platformIncome)}</p>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-xs text-cyan-200 uppercase tracking-wide">Seller Income</p>
                <p className="text-2xl font-black text-cyan-300 mt-1">{currency(summary.sellerIncome)}</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <p className="text-xs text-violet-200 uppercase tracking-wide">Market Income</p>
                <p className="text-2xl font-black text-cyan-300 mt-1">{currency(summary.totalMarketIncome)}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs text-amber-200 uppercase tracking-wide">Wallets Outstanding</p>
                <p className="text-2xl font-black border-amber-500/30 mt-1">{currency(summary.walletsOutstanding)}</p>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="text-xs text-orange-500 uppercase tracking-wide">Pending Settlement</p>
                <p className="text-2xl font-black text-orange-400 mt-1">{currency(summary.pendingSettlementValue)}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
                <p className="text-xs text-fuchsia-500 uppercase tracking-wide">Open Disputes</p>
                <p className="text-2xl font-black text-fuchsia-400 mt-1">{intFormat(summary.openDisputesCount)}</p>
                <p className="text-[11px] text-fuchsia-200/80 mt-1">{intFormat(summary.paidOrdersCount)} paid orders</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0f172a] p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#091022] border border-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Revenue Pulse (30d)</p>
                <p className="text-lg font-black text-white mt-1">{currency(trend.revenuePulse30d)}</p>
              </div>
              <div className="rounded-lg bg-[#091022] border border-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Platform (30d)</p>
                <p className="text-lg font-black text-emerald-200 mt-1">{currency(trend.platformIncome30d)}</p>
              </div>
              <div className="rounded-lg bg-[#091022] border border-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Seller Share (30d)</p>
                <p className="text-lg font-black text-cyan-200 mt-1">{currency(trend.sellerIncome30d)}</p>
              </div>
            </div>

            <form onSubmit={searchHandler} className="rounded-xl border border-white/10 bg-[#0f172a] p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <label className="relative flex-1">
                  <FaSearchDollar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by order id, seller, or buyer..."
                    className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <button type="submit" className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black">
                  Search
                </button>
                <button
                  type="button"
                  onClick={refetch}
                  className="px-5 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-gray-200 font-bold inline-flex items-center gap-2"
                >
                  <FaSync className={isFetching ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={exportingFinance}
                  onClick={() => handleFinanceExport('30d')}
                  className="px-4 py-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-bold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <FaFileDownload /> Export 30 Days
                </button>
                <button
                  type="button"
                  disabled={exportingFinance}
                  onClick={() => handleFinanceExport('6m')}
                  className="px-4 py-2.5 rounded-xl border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-bold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <FaFileDownload /> Export 6 Months
                </button>
                <button
                  type="button"
                  disabled={exportingFinance}
                  onClick={() => handleFinanceExport('1y')}
                  className="px-4 py-2.5 rounded-xl border border-violet-500/35 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 font-bold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <FaFileDownload /> Export 1 Year
                </button>
              </div>
            </form>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-300">Loading finance data...</div> : null}
            {isError ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">Failed to load finance data.</div> : null}

            {!isLoading && !isError && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-sm font-black text-gray-200 flex items-center gap-2">
                    <FaWallet className="text-cyan-300" /> Settlement Ledger
                  </h2>
                  <p className="text-xs text-gray-500">{intFormat(data?.total)} records</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px]">
                    <thead className="bg-[#0a1224] border-b border-white/10">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Seller</th>
                        <th className="px-4 py-3">Buyer</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No transactions found.</td></tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx._id} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="px-4 py-4 text-sm text-gray-300">{new Date(tx.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-4 text-sm text-gray-200 font-semibold">{tx.order}</td>
                            <td className="px-4 py-4 text-sm text-gray-300">
                              <p>{tx.sellerName}</p>
                              <p className="text-xs text-gray-500">{tx.sellerEmail}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-300">{tx.buyerName}</td>
                            <td className="px-4 py-4 text-sm font-black text-emerald-200">{currency(tx.amount)}</td>
                            <td className="px-4 py-4 text-sm text-gray-300">{tx.paymentMethod}</td>
                            <td className="px-4 py-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-black border ${tx.isDelivered ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                                {tx.isDelivered ? 'Delivered' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-400">{tx.note || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Page {data?.page || 1} of {pages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                    >
                      <FaChevronLeft />
                    </button>
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminFinanceScreen;
