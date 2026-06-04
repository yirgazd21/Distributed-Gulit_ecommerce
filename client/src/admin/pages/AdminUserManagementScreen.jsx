import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFileDownload,
  FaSearch,
  FaSignOutAlt,
  FaStore,
  FaSync,
  FaTachometerAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import { useAdminExportSellersCsvMutation, useAdminGetSellersQuery } from '../slices/adminApiSlice';

const sortOptions = [
  { value: 'createdAt_desc', label: 'Newest' },
  { value: 'revenue_desc', label: 'Top Revenue' },
  { value: 'paidOrders_desc', label: 'Most Paid Orders' },
  { value: 'deliveredOrders_desc', label: 'Most Delivered' },
  { value: 'lateOrders_desc', label: 'Most Late Orders' },
  { value: 'deliveryRate_desc', label: 'Best Delivery Rate' },
  { value: 'shopName_asc', label: 'Shop A-Z' },
];

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const AdminUserManagementScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [sortValue, setSortValue] = useState('deliveryRate_desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [sortBy, sortOrder] = sortValue.split('_');

  const { data, isLoading, isError, isFetching, refetch } = useAdminGetSellersQuery({
    status,
    keyword,
    sortBy,
    sortOrder,
    page,
    limit,
  });

  const sellers = data?.sellers || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;
  const [exportSellersCsv, { isLoading: exportingCsv }] = useAdminExportSellersCsvMutation();

  const perf = useMemo(() => {
    const summary = {
      paid: 0,
      delivered: 0,
      late: 0,
      revenue: 0,
    };
    sellers.forEach((seller) => {
      summary.paid += Number(seller.paidOrdersCount || 0);
      summary.delivered += Number(seller.deliveredOrdersCount || 0);
      summary.late += Number(seller.lateOrdersCount || 0);
      summary.revenue += Number(seller.totalRevenue || 0);
    });
    summary.deliveryRate = summary.paid > 0 ? (summary.delivered / summary.paid) * 100 : 0;
    return summary;
  }, [sellers]);

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
  };

  const handleExport = async () => {
    try {
      const csvText = await exportSellersCsv({
        status,
        keyword,
        category: 'all',
        country: 'all',
        sortBy,
        sortOrder,
      }).unwrap();

      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `sellers-performance-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Seller export downloaded');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to export sellers');
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
              <p className="text-lg font-black text-gray-100">Seller Performance</p>
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
          <AdminSidebar activeKey="user-management" />
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <FaStore className="text-cyan-300" /> Seller Performance Table
              </h1>
              <p className="text-gray-300 mt-2">Track operational quality by seller. Click any row to inspect full seller details.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-xs text-cyan-200 uppercase tracking-wide">Paid Orders</p>
                <p className="text-2xl font-black text-cyan-100 mt-1">{perf.paid}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs text-emerald-200 uppercase tracking-wide">Delivered</p>
                <p className="text-2xl font-black text-emerald-100 mt-1">{perf.delivered}</p>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-xs text-red-200 uppercase tracking-wide">Late Orders</p>
                <p className="text-2xl font-black text-red-100 mt-1">{perf.late}</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <p className="text-xs text-violet-200 uppercase tracking-wide">Delivery Rate</p>
                <p className="text-2xl font-black text-violet-100 mt-1">{formatPercent(perf.deliveryRate)}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs text-amber-200 uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-black text-amber-100 mt-1">{currency(perf.revenue)}</p>
              </div>
            </div>

            <form onSubmit={submitSearch} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by seller shop, owner, email, phone..."
                    className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={sortValue}
                  onChange={(e) => {
                    setPage(1);
                    setSortValue(e.target.value);
                  }}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0b1220]">
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
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
                <button
                  type="button"
                  disabled={exportingCsv}
                  onClick={handleExport}
                  className="px-5 py-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-bold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <FaFileDownload /> {exportingCsv ? 'Exporting...' : 'Export CSV'}
                </button>
                <div className="px-4 py-3 rounded-xl border border-white/10 bg-[#020617]/80 text-sm text-gray-300 inline-flex items-center gap-2">
                  <FaTachometerAlt /> {total} sellers found
                </div>
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                >
                  <option value="all" className="bg-[#0b1220]">Status: All</option>
                  <option value="approved" className="bg-[#0b1220]">Approved</option>
                  <option value="pending" className="bg-[#0b1220]">Pending</option>
                  <option value="suspended" className="bg-[#0b1220]">Suspended</option>
                </select>
              </div>
            </form>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-300">Loading sellers...</div> : null}
            {isError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">Failed to load sellers.</div>
            ) : null}

            {!isLoading && !isError && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px]">
                    <thead className="bg-[#0a1224] border-b border-white/10">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Seller</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Delivered</th>
                        <th className="px-4 py-3">Late</th>
                        <th className="px-4 py-3">Delivery Rate</th>
                        <th className="px-4 py-3">Revenue</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            No seller records found for this filter.
                          </td>
                        </tr>
                      ) : (
                        sellers.map((seller) => (
                          <tr
                            key={seller._id}
                            className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer"
                            onClick={() => navigate(`/admin/sellers/${seller._id}`)}
                          >
                            <td className="px-4 py-4">
                              <p className="font-black text-gray-100">{seller.shopName}</p>
                              <p className="text-sm text-gray-400">{seller.name}</p>
                              <p className="text-xs text-gray-500">{seller.email}</p>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-gray-200">{seller.paidOrdersCount || 0}</td>
                            <td className="px-4 py-4 text-sm font-bold text-emerald-200">{seller.deliveredOrdersCount || 0}</td>
                            <td className="px-4 py-4 text-sm font-bold text-red-200">{seller.lateOrdersCount || 0}</td>
                            <td className="px-4 py-4 text-sm font-black text-violet-200">{formatPercent(seller.deliveryRate)}</td>
                            <td className="px-4 py-4 text-sm font-black text-amber-200">{currency(seller.totalRevenue)}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black border w-fit ${seller.isApproved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                                  {seller.isApproved ? 'Approved' : 'Pending'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black border w-fit ${seller.isActive ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                                  {seller.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                            </td>
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

export default AdminUserManagementScreen;
