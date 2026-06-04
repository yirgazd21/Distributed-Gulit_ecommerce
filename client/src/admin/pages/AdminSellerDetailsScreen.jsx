import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaMoneyBillWave,
  FaPowerOff,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSync,
  FaWallet,
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import {
  useAdminGetSellerDetailsQuery,
  useAdminGetSellerActivityQuery,
  useAdminAddSellerNoteMutation,
  useAdminGetSellerOrdersQuery,
  useAdminGetSellerProductsQuery,
  useAdminGetSellerTransactionsQuery,
  useAdminUpdateSellerStatusMutation,
} from '../slices/adminApiSlice';
import { BASE_URL } from '../../store/slices/apiSlice';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'kyc', label: 'KYC Docs' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'activity', label: 'Activity' },
];

const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}/${String(path).replace(/^\/+/, '')}`;
};

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const AdminSellerDetailsScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [productKeywordInput, setProductKeywordInput] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [productStock, setProductStock] = useState('all');
  const [ordersKeywordInput, setOrdersKeywordInput] = useState('');
  const [ordersKeyword, setOrdersKeyword] = useState('');
  const [ordersStatus, setOrdersStatus] = useState('all');
  const [ordersRisk, setOrdersRisk] = useState('all');
  const [activityPage, setActivityPage] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [noteSeverity, setNoteSeverity] = useState('low');
  const [activityAction, setActivityAction] = useState('all');
  const [activitySeverity, setActivitySeverity] = useState('all');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useAdminGetSellerDetailsQuery(id);
  const [updateSellerStatus, { isLoading: updating }] = useAdminUpdateSellerStatusMutation();
  const [addSellerNote, { isLoading: addingNote }] = useAdminAddSellerNoteMutation();
  const { data: txData, isLoading: loadingTransactions } = useAdminGetSellerTransactionsQuery(
    { sellerId: id, page: transactionsPage, limit: 10 },
    { skip: activeTab !== 'transactions' }
  );
  const { data: productData, isLoading: loadingProducts } = useAdminGetSellerProductsQuery(
    { sellerId: id, page: productsPage, limit: 8, keyword: productKeyword, stock: productStock },
    { skip: activeTab !== 'products' }
  );
  const { data: orderData, isLoading: loadingOrders } = useAdminGetSellerOrdersQuery(
    { sellerId: id, page: ordersPage, limit: 10, keyword: ordersKeyword, status: ordersStatus, risk: ordersRisk },
    { skip: activeTab !== 'orders' }
  );
  const { data: activityData, isLoading: loadingActivity } = useAdminGetSellerActivityQuery(
    {
      sellerId: id,
      page: activityPage,
      limit: 10,
      action: activityAction,
      severity: activitySeverity,
      dateFrom: activityDateFrom,
      dateTo: activityDateTo,
    },
    { skip: activeTab !== 'activity' }
  );

  const seller = data?.seller;
  const summary = data?.summary || {};
  const products = productData?.products || [];
  const orders = orderData?.orders || [];
  const transactions = txData?.transactions || [];
  const activities = activityData?.activities || [];
  const riskSummary = summary?.riskSummary || {};

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const applyStatusUpdate = async (payload, message) => {
    try {
      await updateSellerStatus({ sellerId: id, ...payload }).unwrap();
      toast.success(message);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update seller status');
    }
  };

  const applyStatusWithReason = (type) => {
    const note = window.prompt(`Reason for ${type} (required):`, '');
    if (note === null) return;
    if (!String(note).trim()) {
      toast.error(`Reason for ${type} is required`);
      return;
    }
    const payload = type === 'suspension'
      ? { isActive: false, note: String(note).trim() }
      : { isActive: true, note: String(note).trim() };
    const message = type === 'suspension' ? `${seller.shopName} suspended` : `${seller.shopName} reactivated`;
    applyStatusUpdate(payload, message);
  };

  const submitNote = async (e) => {
    e.preventDefault();
    const trimmed = String(noteText || '').trim();
    if (!trimmed) {
      toast.error('Note is required');
      return;
    }

    try {
      await addSellerNote({
        sellerId: id,
        note: trimmed,
        severity: noteSeverity,
      }).unwrap();
      toast.success('Admin note added');
      setNoteText('');
      setActivityPage(1);
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to add note');
    }
  };

  const exportActivityCsv = () => {
    if (!activities.length) {
      toast.error('No activity to export');
      return;
    }

    const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Action', 'Severity', 'Admin Name', 'Admin Email', 'Note', 'Status Change'],
      ...activities.map((entry) => [
        new Date(entry.createdAt).toISOString(),
        entry.action,
        entry.metadata?.severity || '',
        entry.admin?.name || '',
        entry.admin?.email || '',
        entry.note || '',
        entry.metadata?.statusChange || '',
      ]),
    ];
    const csv = rows.map((row) => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seller-activity-${id}-page-${activityData?.page || 1}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const statusText = useMemo(() => {
    if (!seller) return '';
    if (!seller.isActive) return 'Suspended';
    if (!seller.isApproved) return 'Pending Approval';
    return 'Approved & Active';
  }, [seller]);

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
              <p className="text-lg font-black text-gray-100">Seller Detail Workspace</p>
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
          <AdminSidebar activeKey="seller-review" />

          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/admin/sellers" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-bold">
                <FaArrowLeft /> Back to Seller List
              </Link>
              <button
                type="button"
                onClick={refetch}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-gray-200 text-sm font-bold inline-flex items-center gap-2"
              >
                <FaSync className={isFetching ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-300">Loading seller workspace...</div> : null}
            {isError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">
                Failed to load seller details.
              </div>
            ) : null}

            {!isLoading && !isError && seller ? (
              <>
                <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300 font-bold mb-2">Seller Profile</p>
                  <h1 className="text-2xl sm:text-3xl font-black">{seller.shopName}</h1>
                  <p className="text-gray-300 mt-2">{seller.name} • {seller.email} • {seller.phoneNumber}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${seller.isApproved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                      {seller.isApproved ? 'Approved' : 'Pending'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${seller.isActive ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                      {seller.isActive ? 'Active' : 'Suspended'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black border border-white/20 text-gray-200">{statusText}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!seller.isApproved ? (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => applyStatusUpdate({ isApproved: true, isActive: true }, `${seller.shopName} approved`)}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#04111f] text-sm font-black inline-flex items-center gap-2"
                      >
                        <FaCheckCircle /> Approve Seller
                      </button>
                    ) : null}
                    {seller.isActive ? (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => applyStatusWithReason('suspension')}
                        className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-black inline-flex items-center gap-2"
                      >
                        <FaPowerOff /> Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => applyStatusWithReason('reactivation')}
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#04111f] text-sm font-black inline-flex items-center gap-2"
                      >
                        <FaShieldAlt /> Reactivate
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Seller Revenue</p>
                    <p className="text-2xl font-black text-emerald-200 mt-1">{currency(summary.sellerRevenue)}</p>
                    <p className="text-xs text-gray-500 mt-1">Paid orders only</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Platform Contribution</p>
                    <p className="text-2xl font-black text-fuchsia-200 mt-1">{currency(summary.platformContribution)}</p>
                    <p className="text-xs text-gray-500 mt-1">Commission from this seller</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Orders</p>
                    <p className="text-2xl font-black text-cyan-200 mt-1">{summary.totalOrders || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{summary.pendingOrdersCount || 0} pending delivery</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Wallet Balance</p>
                    <p className="text-2xl font-black text-amber-200 mt-1">{currency(summary.walletBalance)}</p>
                    <p className="text-xs text-gray-500 mt-1">Current seller wallet</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Watch Orders</p>
                    <p className="text-2xl font-black text-amber-200 mt-1">{riskSummary.pendingWatchOrders || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Paid pending 3-7 days</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Overdue Deliveries</p>
                    <p className="text-2xl font-black text-orange-200 mt-1">{riskSummary.overdueDeliveries || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Paid pending 7+ days</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">High Risk Orders</p>
                    <p className="text-2xl font-black text-red-300 mt-1">{riskSummary.highRiskOrders || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Paid pending 14+ days</p>
                  </div>
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Aging Unpaid</p>
                    <p className="text-2xl font-black text-fuchsia-200 mt-1">{riskSummary.agingUnpaidOrders || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Unpaid for 7+ days</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key);
                        if (tab.key === 'transactions') setTransactionsPage(1);
                        if (tab.key === 'products') setProductsPage(1);
                        if (tab.key === 'orders') setOrdersPage(1);
                        if (tab.key === 'activity') setActivityPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                        activeTab === tab.key
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                          : 'border-white/10 bg-[#0f172a] text-gray-300 hover:bg-white/[0.03]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                      <h2 className="font-black text-lg mb-3">Business Details</h2>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p><span className="text-gray-500">Shop Category:</span> {seller.shopCategory || 'Other'}</p>
                        <p><span className="text-gray-500">Business Legal Name:</span> {seller.businessLegalName || '-'}</p>
                        <p><span className="text-gray-500">Tax ID / VAT Number:</span> <span className="text-cyan-300 font-bold">{seller.taxIdVatNumber || '-'}</span></p>
                        <p><span className="text-gray-500">National ID:</span> {seller.nationalIdNumber || '-'}</p>
                        <p><span className="text-gray-500">Address:</span> {seller.address?.street || '-'}, {seller.address?.city || '-'}, {seller.address?.country || '-'}</p>
                        <p><span className="text-gray-500">Registered:</span> {new Date(seller.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                      <h2 className="font-black text-lg mb-3">Stock & Fulfillment</h2>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p><span className="text-gray-500">Total Products:</span> {summary.totalProducts || 0}</p>
                        <p><span className="text-gray-500">Low Stock:</span> {summary.lowStockProducts || 0}</p>
                        <p><span className="text-gray-500">Out of Stock:</span> {summary.outOfStockProducts || 0}</p>
                        <p><span className="text-gray-500">Delivered Orders:</span> {summary.deliveredOrdersCount || 0}</p>
                        <p><span className="text-gray-500">Unpaid Orders:</span> {summary.unpaidOrdersCount || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'kyc' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href={fileUrl(seller.kycDocuments?.idCardImage)} target="_blank" rel="noreferrer" className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.03]">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Identity Document</p>
                      <p className="font-black mt-1">National ID</p>
                    </a>
                    <a href={fileUrl(seller.kycDocuments?.merchantLicenseImage)} target="_blank" rel="noreferrer" className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.03]">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Business Document</p>
                      <p className="font-black mt-1">Merchant License</p>
                    </a>
                    <a href={fileUrl(seller.kycDocuments?.taxReceiptImage)} target="_blank" rel="noreferrer" className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.03]">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Tax Document</p>
                      <p className="font-black mt-1">Tax Receipt</p>
                    </a>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 font-black flex items-center gap-2">
                      <FaWallet /> Recent Transactions
                    </div>
                    {loadingTransactions ? <div className="px-4 py-4 text-gray-400 text-sm">Loading transactions...</div> : null}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px]">
                        <thead className="bg-[#0a1224]">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No transactions yet.</td></tr>
                          ) : (
                            transactions.map((tx) => (
                              <tr key={tx._id} className="border-t border-white/5">
                                <td className="px-4 py-3 text-sm text-gray-300">{new Date(tx.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-cyan-200">{tx.type}</td>
                                <td className="px-4 py-3 text-sm font-bold text-emerald-200">{currency(tx.amount)}</td>
                                <td className="px-4 py-3 text-sm text-gray-300">{tx.order?._id || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-400">{tx.note || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                      <p className="text-xs text-gray-500">Page {txData?.page || 1} of {txData?.pages || 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!txData?.hasPrevPage}
                          onClick={() => setTransactionsPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronLeft />
                        </button>
                        <button
                          type="button"
                          disabled={!txData?.hasNextPage}
                          onClick={() => setTransactionsPage((prev) => prev + 1)}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setProductsPage(1);
                        setProductKeyword(productKeywordInput.trim());
                      }}
                      className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3"
                    >
                      <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={productKeywordInput}
                          onChange={(e) => setProductKeywordInput(e.target.value)}
                          placeholder="Search product name/category/brand..."
                          className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <select
                        value={productStock}
                        onChange={(e) => {
                          setProductsPage(1);
                          setProductStock(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      >
                        <option value="all" className="bg-[#0b1220]">All Stock</option>
                        <option value="in" className="bg-[#0b1220]">In Stock</option>
                        <option value="low" className="bg-[#0b1220]">Low Stock</option>
                        <option value="out" className="bg-[#0b1220]">Out of Stock</option>
                      </select>
                      <button type="submit" className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black">
                        Apply
                      </button>
                    </form>

                    {loadingProducts ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 text-sm text-gray-400">Loading products...</div> : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {products.length === 0 ? (
                        <div className="col-span-full bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-400">No products found.</div>
                      ) : (
                        products.map((product) => (
                          <div key={product._id} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                            <p className="font-black line-clamp-2">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                            <p className="text-sm text-emerald-200 font-bold mt-2">{currency(product.price)}</p>
                            <p className="text-xs text-gray-400 mt-2">Stock: {product.countInStock}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-xs text-gray-500">Page {productData?.page || 1} of {productData?.pages || 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!productData?.hasPrevPage}
                          onClick={() => setProductsPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronLeft />
                        </button>
                        <button
                          type="button"
                          disabled={!productData?.hasNextPage}
                          onClick={() => setProductsPage((prev) => prev + 1)}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setOrdersPage(1);
                        setOrdersKeyword(ordersKeywordInput.trim());
                      }}
                      className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3"
                    >
                      <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={ordersKeywordInput}
                          onChange={(e) => setOrdersKeywordInput(e.target.value)}
                          placeholder="Search by order id or buyer..."
                          className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <select
                        value={ordersStatus}
                        onChange={(e) => {
                          setOrdersPage(1);
                          setOrdersStatus(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      >
                        <option value="all" className="bg-[#0b1220]">All Orders</option>
                        <option value="paid" className="bg-[#0b1220]">Paid</option>
                        <option value="unpaid" className="bg-[#0b1220]">Unpaid</option>
                        <option value="pendingDelivery" className="bg-[#0b1220]">Pending Delivery</option>
                        <option value="delivered" className="bg-[#0b1220]">Delivered</option>
                      </select>
                      <select
                        value={ordersRisk}
                        onChange={(e) => {
                          setOrdersPage(1);
                          setOrdersRisk(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      >
                        <option value="all" className="bg-[#0b1220]">Risk: All</option>
                        <option value="watch" className="bg-[#0b1220]">Risk: Watch</option>
                        <option value="overdue" className="bg-[#0b1220]">Risk: Overdue</option>
                        <option value="high" className="bg-[#0b1220]">Risk: High</option>
                        <option value="unpaidAging" className="bg-[#0b1220]">Risk: Unpaid Aging</option>
                      </select>
                      <button type="submit" className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black">
                        Apply
                      </button>
                    </form>

                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 font-black flex items-center gap-2">
                      <FaMoneyBillWave /> Recent Orders
                    </div>
                    {loadingOrders ? <div className="px-4 py-4 text-gray-400 text-sm">Loading orders...</div> : null}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px]">
                        <thead className="bg-[#0a1224]">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Buyer</th>
                            <th className="px-4 py-3">Items</th>
                            <th className="px-4 py-3">Seller Revenue</th>
                            <th className="px-4 py-3">Paid</th>
                            <th className="px-4 py-3">Delivered</th>
                            <th className="px-4 py-3">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No orders found.</td></tr>
                          ) : (
                            orders.map((order) => (
                              <tr key={order._id} className="border-t border-white/5">
                                <td className="px-4 py-3 text-sm text-gray-300">{order._id}</td>
                                <td className="px-4 py-3 text-sm text-gray-300">{order.buyerName || '-'}<p className="text-xs text-gray-500">{order.buyerEmail || '-'}</p></td>
                                <td className="px-4 py-3 text-sm text-gray-300">{order.sellerItems || 0}</td>
                                <td className="px-4 py-3 text-sm font-bold text-emerald-200">{currency(order.sellerRevenue)}</td>
                                <td className="px-4 py-3 text-sm">{order.isPaid ? <span className="text-emerald-200 inline-flex items-center gap-1"><FaCheckCircle /> Paid</span> : <span className="text-amber-200 inline-flex items-center gap-1"><FaClock /> Unpaid</span>}</td>
                                <td className="px-4 py-3 text-sm">{order.isDelivered ? <span className="text-cyan-200">Delivered</span> : <span className="text-amber-200">Pending</span>}</td>
                                <td className="px-4 py-3 text-sm">
                                  {order.riskLevel === 'high' && (
                                    <div className="space-y-1">
                                      <span className="px-2 py-1 rounded-full text-xs font-black border border-red-500/40 bg-red-500/10 text-red-200">HIGH</span>
                                      <p className="text-xs text-red-300">Dispute-ready</p>
                                    </div>
                                  )}
                                  {order.riskLevel === 'overdue' && (
                                    <div className="space-y-1">
                                      <span className="px-2 py-1 rounded-full text-xs font-black border border-orange-500/40 bg-orange-500/10 text-orange-200">OVERDUE</span>
                                      {order.disputeReady ? <p className="text-xs text-orange-300">Escalate soon</p> : null}
                                    </div>
                                  )}
                                  {order.riskLevel === 'watch' && (
                                    <span className="px-2 py-1 rounded-full text-xs font-black border border-amber-500/40 bg-amber-500/10 text-amber-200">WATCH</span>
                                  )}
                                  {order.riskLevel === 'unpaidAging' && (
                                    <span className="px-2 py-1 rounded-full text-xs font-black border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200">UNPAID AGING</span>
                                  )}
                                  {order.riskLevel === 'none' && (
                                    <span className="px-2 py-1 rounded-full text-xs font-black border border-gray-500/30 bg-gray-500/10 text-gray-300">LOW</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                      <p className="text-xs text-gray-500">Page {orderData?.page || 1} of {orderData?.pages || 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!orderData?.hasPrevPage}
                          onClick={() => setOrdersPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronLeft />
                        </button>
                        <button
                          type="button"
                          disabled={!orderData?.hasNextPage}
                          onClick={() => setOrdersPage((prev) => prev + 1)}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                        >
                          <FaChevronRight />
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
                      <select
                        value={activityAction}
                        onChange={(e) => {
                          setActivityPage(1);
                          setActivityAction(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      >
                        <option value="all" className="bg-[#0b1220]">Action: All</option>
                        <option value="STATUS_UPDATE" className="bg-[#0b1220]">Action: Status Update</option>
                        <option value="NOTE" className="bg-[#0b1220]">Action: Note</option>
                      </select>
                      <select
                        value={activitySeverity}
                        onChange={(e) => {
                          setActivityPage(1);
                          setActivitySeverity(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      >
                        <option value="all" className="bg-[#0b1220]">Severity: All</option>
                        <option value="low" className="bg-[#0b1220]">Severity: Low</option>
                        <option value="medium" className="bg-[#0b1220]">Severity: Medium</option>
                        <option value="high" className="bg-[#0b1220]">Severity: High</option>
                      </select>
                      <input
                        type="date"
                        value={activityDateFrom}
                        onChange={(e) => {
                          setActivityPage(1);
                          setActivityDateFrom(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="date"
                        value={activityDateTo}
                        onChange={(e) => {
                          setActivityPage(1);
                          setActivityDateTo(e.target.value);
                        }}
                        className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={exportActivityCsv}
                        className="px-4 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-gray-200 font-black"
                      >
                        Export CSV
                      </button>
                    </div>
                    <form
                      onSubmit={submitNote}
                      className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                      <p className="font-black">Add Admin Note</p>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write moderation note, warning, or follow-up action..."
                        className="w-full min-h-28 px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex flex-wrap gap-3">
                        <select
                          value={noteSeverity}
                          onChange={(e) => setNoteSeverity(e.target.value)}
                          className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                        >
                          <option value="low" className="bg-[#0b1220]">Severity: Low</option>
                          <option value="medium" className="bg-[#0b1220]">Severity: Medium</option>
                          <option value="high" className="bg-[#0b1220]">Severity: High</option>
                        </select>
                        <button
                          type="submit"
                          disabled={addingNote}
                          className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black disabled:opacity-70"
                        >
                          {addingNote ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>
                    </form>

                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/10 font-black">Activity Timeline</div>
                      {loadingActivity ? <div className="px-4 py-4 text-gray-400 text-sm">Loading activity...</div> : null}
                      <div className="divide-y divide-white/5">
                        {activities.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400">No activity yet.</div>
                        ) : (
                          activities.map((entry) => (
                            <div key={entry._id} className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="px-2 py-1 rounded-full text-xs font-black border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                                  {entry.action}
                                </span>
                                {entry.metadata?.severity ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-black border ${
                                    entry.metadata.severity === 'high'
                                      ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                      : entry.metadata.severity === 'medium'
                                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                  }`}>
                                    {entry.metadata.severity.toUpperCase()}
                                  </span>
                                ) : null}
                                <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-gray-300">{entry.note || 'No note provided'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                By: {entry.admin?.name || 'Admin'} ({entry.admin?.email || '-'})
                              </p>
                              {entry.metadata?.statusChange ? (
                                <p className="text-xs text-gray-500 mt-1">Change: {entry.metadata.statusChange}</p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {activityData?.page || 1} of {activityData?.pages || 1}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!activityData?.hasPrevPage}
                            onClick={() => setActivityPage((prev) => Math.max(prev - 1, 1))}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                          >
                            <FaChevronLeft />
                          </button>
                          <button
                            type="button"
                            disabled={!activityData?.hasNextPage}
                            onClick={() => setActivityPage((prev) => prev + 1)}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-sm disabled:opacity-40"
                          >
                            <FaChevronRight />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminSellerDetailsScreen;
