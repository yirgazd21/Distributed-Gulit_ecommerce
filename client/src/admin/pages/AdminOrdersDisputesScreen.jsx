import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaGavel,
  FaSearch,
  FaSignOutAlt,
  FaSync,
} from 'react-icons/fa';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import { useAdminGetOrdersQuery } from '../slices/adminApiSlice';

const statusBadge = (riskLevel) => {
  if (riskLevel === 'high') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (riskLevel === 'overdue') return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
  if (riskLevel === 'watch') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (riskLevel === 'unpaidAging') return 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200';
  return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
};

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const AdminOrdersDisputesScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [payment, setPayment] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [dispute, setDispute] = useState('all');
  const [risk, setRisk] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const { data, isLoading, isError, isFetching, refetch } = useAdminGetOrdersQuery({
    page,
    limit,
    keyword,
    payment,
    delivery,
    dispute,
    risk,
  });

  const orders = data?.orders || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  const counts = useMemo(() => {
    const c = { high: 0, overdue: 0, watch: 0, unpaidAging: 0 };
    orders.forEach((order) => {
      if (c[order.riskLevel] !== undefined) c[order.riskLevel] += 1;
    });
    return c;
  }, [orders]);

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
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
              <p className="text-lg font-black text-gray-100">Orders & Disputes</p>
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
          <AdminSidebar activeKey="orders-disputes" />
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <FaGavel className="text-cyan-300" /> Orders & Disputes Queue
              </h1>
              <p className="text-gray-300 mt-2">Monitor order-level risk and compare buyer and seller performance in one queue.</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-xs text-red-200 uppercase tracking-wide">High Risk</p>
                <p className="text-2xl font-black text-red-200 mt-1">{counts.high}</p>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="text-xs text-orange-200 uppercase tracking-wide">Overdue</p>
                <p className="text-2xl font-black text-orange-200 mt-1">{counts.overdue}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs text-amber-200 uppercase tracking-wide">Watch</p>
                <p className="text-2xl font-black text-amber-200 mt-1">{counts.watch}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
                <p className="text-xs text-fuchsia-200 uppercase tracking-wide">Unpaid Aging</p>
                <p className="text-2xl font-black text-fuchsia-200 mt-1">{counts.unpaidAging}</p>
              </div>
            </div>

            <form onSubmit={submitSearch} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                <div className="relative md:col-span-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search order id / buyer / seller..."
                    className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select value={payment} onChange={(e) => { setPage(1); setPayment(e.target.value); }} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Payment: All</option>
                  <option value="paid" className="bg-[#0b1220]">Paid</option>
                  <option value="unpaid" className="bg-[#0b1220]">Unpaid</option>
                </select>
                <select value={delivery} onChange={(e) => { setPage(1); setDelivery(e.target.value); }} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Delivery: All</option>
                  <option value="pending" className="bg-[#0b1220]">Pending</option>
                  <option value="delivered" className="bg-[#0b1220]">Delivered</option>
                </select>
                <select value={dispute} onChange={(e) => { setPage(1); setDispute(e.target.value); }} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Dispute: All</option>
                  <option value="none" className="bg-[#0b1220]">None</option>
                  <option value="open" className="bg-[#0b1220]">Open</option>
                  <option value="in_review" className="bg-[#0b1220]">In Review</option>
                  <option value="resolved" className="bg-[#0b1220]">Resolved</option>
                  <option value="rejected" className="bg-[#0b1220]">Rejected</option>
                </select>
                <select value={risk} onChange={(e) => { setPage(1); setRisk(e.target.value); }} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Risk: All</option>
                  <option value="watch" className="bg-[#0b1220]">Watch</option>
                  <option value="overdue" className="bg-[#0b1220]">Overdue</option>
                  <option value="high" className="bg-[#0b1220]">High</option>
                  <option value="unpaidAging" className="bg-[#0b1220]">Unpaid Aging</option>
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
                <span className="px-4 py-3 rounded-xl border border-white/10 bg-[#020617]/80 text-sm text-gray-300">
                  {total} orders in queue
                </span>
              </div>
            </form>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-300">Loading orders...</div> : null}
            {isError ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">Failed to load queue.</div> : null}

            {!isLoading && !isError && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px]">
                    <thead className="bg-[#0a1224] border-b border-white/10">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Buyer</th>
                        <th className="px-4 py-3">Seller</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Delivery</th>
                        <th className="px-4 py-3">Risk</th>
                        <th className="px-4 py-3">Dispute</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No orders match these filters.</td></tr>
                      ) : (
                        orders.map((order) => (
                          <tr key={order._id} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="px-4 py-4 text-sm text-gray-200">
                              <p className="font-black">{order._id}</p>
                              <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-300">
                              <p>{order.buyerName || '-'}</p>
                              <p className="text-xs text-gray-500">{order.buyerEmail || '-'}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-300">
                              {Array.isArray(order.sellerNames) && order.sellerNames.length > 0 ? (
                                <>
                                  <p className="font-semibold text-gray-200">{order.sellerNames[0]}</p>
                                  {order.sellerNames[1] ? <p className="text-xs text-gray-500">+{order.sellerNames.length - 1} more</p> : null}
                                  {Array.isArray(order.sellerEmails) && order.sellerEmails[0] ? (
                                    <p className="text-xs text-gray-500">{order.sellerEmails[0]}</p>
                                  ) : null}
                                </>
                              ) : (
                                <p>-</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm font-black text-emerald-200">{currency(order.totalPrice)}</td>
                            <td className="px-4 py-4 text-sm">{order.isPaid ? <span className="text-emerald-200">Paid</span> : <span className="text-amber-200">Unpaid</span>}</td>
                            <td className="px-4 py-4 text-sm">{order.isDelivered ? <span className="text-cyan-200">Delivered</span> : <span className="text-orange-200">Pending</span>}</td>
                            <td className="px-4 py-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-black border ${statusBadge(order.riskLevel)}`}>
                                {String(order.riskLevel || 'none').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-black border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                                {String(order.disputeStatus || 'none').toUpperCase()}
                              </span>
                              {order.disputeNote ? <p className="text-xs text-gray-500 mt-1 line-clamp-2">{order.disputeNote}</p> : null}
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

export default AdminOrdersDisputesScreen;
