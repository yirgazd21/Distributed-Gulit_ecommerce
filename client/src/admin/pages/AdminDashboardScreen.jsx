import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaChartLine,
  FaClipboardList,
  FaExclamationTriangle,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaStore,
  FaUsers,
} from 'react-icons/fa';
import { adminLogout } from '../slices/adminAuthSlice';
import { useAdminStatsQuery } from '../slices/adminApiSlice';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';

const AdminDashboardScreen = () => {
  const { adminInfo } = useSelector((state) => state.adminAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: stats, isLoading, isError, refetch, isFetching } = useAdminStatsQuery();

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const formatInt = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const activityRate = stats?.registeredUsers
    ? ((Number(stats.activeUsers || 0) / Number(stats.registeredUsers || 1)) * 100).toFixed(1)
    : '0.0';

  const cards = [
    {
      label: 'Registered Users',
      value: formatInt(stats?.registeredUsers),
      delta: `${activityRate}% active`,
      icon: FaUsers,
      iconColor: 'text-cyan-300',
      chip: 'buyer accounts',
    },
    {
      label: 'Active Users (30d)',
      value: formatInt(stats?.activeUsers),
      delta: `${formatInt(stats?.paidOrdersCount)} paid orders`,
      icon: FaUsers,
      iconColor: 'text-blue-300',
      chip: 'distinct buyers',
    },
    {
      label: 'Active Sellers',
      value: formatInt(stats?.activeSellers),
      delta: `${formatInt(stats?.pendingSellerApprovals)} pending`,
      icon: FaStore,
      iconColor: 'text-emerald-300',
      chip: 'approved + active',
    },
    {
      label: 'Risk Alerts',
      value: formatInt(stats?.riskAlerts),
      delta: `${formatInt(stats?.overduePaidUndelivered)} overdue deliveries`,
      icon: FaExclamationTriangle,
      iconColor: 'text-amber-300',
      chip: 'pending + suspended + overdue',
    },
    {
      label: 'Platform Income',
      value: formatCurrency(stats?.platformIncome),
      delta: 'all paid transactions',
      icon: FaChartLine,
      iconColor: 'text-fuchsia-300',
      chip: 'commission earnings',
    },
    {
      label: 'Total Market Income',
      value: formatCurrency(stats?.totalMarketIncome),
      delta: `${formatCurrency(stats?.sellerIncome)} seller share`,
      icon: FaChartLine,
      iconColor: 'text-violet-300',
      chip: 'seller + platform (no tax)',
    },
    {
      label: 'Revenue Pulse (30d)',
      value: formatCurrency(stats?.revenuePulse),
      delta: `updated ${stats?.lastUpdatedAt ? new Date(stats.lastUpdatedAt).toLocaleString() : '-'}`,
      icon: FaChartLine,
      iconColor: 'text-lime-300',
      chip: 'total paid order value',
    },
  ];

  const queues = [
    { title: 'Seller Approvals', count: stats?.pendingSellerApprovals || 0, color: 'text-cyan-200' },
    { title: 'Suspended Sellers', count: stats?.suspendedSellers || 0, color: 'text-amber-200' },
    { title: 'Overdue Deliveries', count: stats?.overduePaidUndelivered || 0, color: 'text-red-200' },
    { title: 'Risk Alerts', count: stats?.riskAlerts || 0, color: 'text-orange-200' },
  ];

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
              <p className="text-lg font-black text-gray-100">Marketplace Control Room</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-300">
              <FaSearch className="text-gray-500" />
              <span>Search sellers, users, orders...</span>
            </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(80px,260px)_1fr] gap-6">
          <AdminSidebar activeKey="dashboard" />

          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300 font-bold mb-2">Dashboard</p>
                <h1 className="text-2xl sm:text-3xl font-black">Welcome, {adminInfo?.name}</h1>
                <p className="text-gray-300 mt-2">Control trust, growth, and marketplace safety from one dashboard.</p>
                <div className="md:hidden mt-4">
                  <div className="mb-3">
                    <ThemeToggle />
                  </div>
                  <button
                    type="button"
                    onClick={logoutHandler}
                    className="inline-flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-200 font-bold px-4 py-2.5 rounded-xl border border-red-500/30 transition-colors"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-[#0f172a]/90 border border-white/10 rounded-2xl p-5 text-gray-300">
                Loading real dashboard metrics...
              </div>
            ) : null}

            {isError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
                <p className="text-red-200 font-bold">Failed to load dashboard metrics.</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-3 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-100 font-bold"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {cards.map((card) => (
                <div key={card.label} className="bg-[#0f172a]/90 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#020617]/80 border border-white/10 flex items-center justify-center">
                      <card.icon className={card.iconColor} />
                    </div>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                      {card.delta}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className="text-3xl font-black mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.chip}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{card.delta}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-[#0f172a]/90 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-black flex items-center gap-3 mb-2">
                  <FaShieldAlt className="text-cyan-300" /> Governance Priorities
                </h2>
                <p className="text-gray-300 mb-5">
                  Focus on verification integrity, dispute handling, and operational bottlenecks with real-time platform metrics.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#020617]/80 border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FaClipboardList className="text-cyan-300" />
                      <p className="font-bold text-gray-100">Review newly submitted seller KYC documents</p>
                    </div>
                    <FaArrowRight className="text-cyan-300" />
                  </div>
                  <div className="flex items-center justify-between bg-[#020617]/80 border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FaClipboardList className="text-cyan-300" />
                      <p className="font-bold text-gray-100">Validate pending order disputes and escalation notes</p>
                    </div>
                    <FaArrowRight className="text-cyan-300" />
                  </div>
                  <div className="flex items-center justify-between bg-[#020617]/80 border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FaClipboardList className="text-cyan-300" />
                      <p className="font-bold text-gray-100">Audit suspicious transactions and repeat violation patterns</p>
                    </div>
                    <FaArrowRight className="text-cyan-300" />
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/90 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-black mb-4">Action Queue</h2>
                <div className="space-y-3">
                  {queues.map((queue) => (
                    <div key={queue.title} className="flex items-center justify-between bg-[#020617]/80 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-sm text-gray-300">{queue.title}</p>
                      <span className={`font-black ${queue.color}`}>{queue.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Next page can be the Seller Approval module linked from this queue.
                </p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-3 text-xs px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-gray-200 font-bold"
                >
                  {isFetching ? 'Refreshing...' : 'Refresh Metrics'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#081122]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src={logo} alt="Gulit" className="w-8 h-8 object-contain" />
                <p className="font-black text-gray-100">Gulit Admin</p>
              </div>
              <p className="text-sm text-gray-400 leading-6">
                Central operations for trust, compliance, moderation, and marketplace growth.
              </p>
            </div>
            <div>
              <p className="font-bold text-gray-200 mb-3">Operations</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Seller verification workflow</li>
                <li>Buyer and seller account controls</li>
                <li>Risk and fraud signal monitoring</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-gray-200 mb-3">Financial Summary</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Platform income: {formatCurrency(stats?.platformIncome)}</li>
                <li>Seller income: {formatCurrency(stats?.sellerIncome)}</li>
                <li>Market income: {formatCurrency(stats?.totalMarketIncome)}</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-gray-200 mb-3">System Status</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Auth: Active</li>
                <li>Metrics sync: {isFetching ? 'Updating' : 'Live'}</li>
                <li>Last update: {stats?.lastUpdatedAt ? new Date(stats.lastUpdatedAt).toLocaleString() : 'N/A'}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Gulit Marketplace. All rights reserved.</p>
            <p>Security-first operations panel</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboardScreen;
