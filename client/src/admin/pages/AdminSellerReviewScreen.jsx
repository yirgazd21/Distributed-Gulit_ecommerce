import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaPowerOff,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSortAmountDown,
  FaStore,
  FaSync,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import { adminLogout } from '../slices/adminAuthSlice';
import { useAdminGetSellersQuery, useAdminUpdateSellerStatusMutation } from '../slices/adminApiSlice';
import { BASE_URL } from '../../store/slices/apiSlice';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';

const categories = ['all', 'Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Beauty', 'Other'];
const countries = ['all', 'Ethiopia'];

const statusOptions = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
];

const sortOptions = [
  { value: 'createdAt_desc', label: 'Newest' },
  { value: 'createdAt_asc', label: 'Oldest' },
  { value: 'revenue_desc', label: 'Top Revenue' },
  { value: 'paidOrders_desc', label: 'Most Paid Orders' },
  { value: 'pendingOrders_desc', label: 'Most Pending Orders' },
  { value: 'products_desc', label: 'Most Products' },
  { value: 'shopName_asc', label: 'Shop A-Z' },
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

const AdminSellerReviewScreen = () => {
  const { adminInfo } = useSelector((state) => state.adminAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [country, setCountry] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortValue, setSortValue] = useState('createdAt_desc');

  const [sortBy, sortOrder] = sortValue.split('_');

  const { data, isLoading, isError, refetch, isFetching } = useAdminGetSellersQuery({
    status,
    keyword,
    category,
    country,
    sortBy,
    sortOrder,
    page,
    limit,
  });

  const sellers = data?.sellers || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  const [updateSellerStatus, { isLoading: updating }] = useAdminUpdateSellerStatusMutation();

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const counts = useMemo(() => {
    const summary = { pending: 0, approved: 0, suspended: 0, all: sellers.length };
    sellers.forEach((seller) => {
      if (!seller.isActive) summary.suspended += 1;
      else if (!seller.isApproved) summary.pending += 1;
      else summary.approved += 1;
    });
    return summary;
  }, [sellers]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
  };

  const applyStatusUpdate = async (sellerId, payload, successMessage) => {
    try {
      await updateSellerStatus({ sellerId, ...payload }).unwrap();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update seller status');
    }
  };

  const onChangeFilter = (updater) => {
    setPage(1);
    updater();
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
              <p className="text-lg font-black text-gray-100">Seller Management</p>
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
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300 font-bold mb-2">Phase 1</p>
              <h1 className="text-2xl sm:text-3xl font-black">Seller List & Controls</h1>
              <p className="text-gray-300 mt-2">Filter, sort, and inspect sellers in one clean table. Click any row to open seller detail workspace.</p>
              <p className="text-xs text-gray-500 mt-3">Signed in as {adminInfo?.name} ({adminInfo?.email})</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChangeFilter(() => setStatus(option.key))}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    status === option.key
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                      : 'border-white/10 bg-[#0f172a] text-gray-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <p className="text-sm font-bold">{option.label}</p>
                  <p className="text-xl font-black mt-1">{counts[option.key]}</p>
                </button>
              ))}
            </div>

            <form onSubmit={submitSearch} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="relative md:col-span-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search shop, owner, email, phone, national ID..."
                    className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => onChangeFilter(() => setCategory(e.target.value))}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  {categories.map((item) => (
                    <option key={item} value={item} className="bg-[#0b1220]">
                      Category: {item}
                    </option>
                  ))}
                </select>
                <select
                  value={country}
                  onChange={(e) => onChangeFilter(() => setCountry(e.target.value))}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  {countries.map((item) => (
                    <option key={item} value={item} className="bg-[#0b1220]">
                      Country: {item}
                    </option>
                  ))}
                </select>
                <select
                  value={sortValue}
                  onChange={(e) => onChangeFilter(() => setSortValue(e.target.value))}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  {sortOptions.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0b1220]">
                      Sort: {item.label}
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
                <span className="px-4 py-3 rounded-xl border border-white/10 bg-[#020617]/80 text-sm text-gray-300 inline-flex items-center gap-2">
                  <FaSortAmountDown /> {total} sellers found
                </span>
              </div>
            </form>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-gray-300">Loading sellers...</div> : null}
            {isError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">
                Failed to load sellers. Try refresh.
              </div>
            ) : null}

            {!isLoading && !isError && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px]">
                    <thead className="bg-[#0a1224] border-b border-white/10">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Seller</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Business Info</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Products</th>
                        <th className="px-4 py-3">Paid Orders</th>
                        <th className="px-4 py-3">Pending Orders</th>
                        <th className="px-4 py-3">Revenue</th>
                        <th className="px-4 py-3">KYC</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                            No sellers found for these filters.
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
                              <p className="text-xs text-gray-500">{seller.phoneNumber}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-300">
                              <p>{seller.shopCategory || 'Other'}</p>
                              <p className="text-xs text-gray-500">{seller.address?.country || '-'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-2">                                <p className="text-sm font-bold text-gray-200">{seller.businessLegalName || '-'}</p>
                                <p className="text-xs text-gray-500">Legal: {seller.businessLegalName ? 'Yes' : 'No'}</p>
                                <p className="text-xs text-cyan-300">Tax ID: {seller.taxIdVatNumber || '-'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1 text-xs">                                <span className={`px-2.5 py-1 rounded-full text-xs font-black border w-fit ${seller.isApproved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                                  {seller.isApproved ? 'Approved' : 'Pending'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black border w-fit ${seller.isActive ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                                  {seller.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-gray-200">{seller.totalProducts || 0}</td>
                            <td className="px-4 py-4 text-sm font-bold text-gray-200">{seller.paidOrdersCount || 0}</td>
                            <td className="px-4 py-4 text-sm font-bold text-amber-200">{seller.pendingOrdersCount || 0}</td>
                            <td className="px-4 py-4 text-sm font-black text-emerald-200">{currency(seller.totalRevenue)}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1 text-xs">
                                <a href={fileUrl(seller.kycDocuments?.idCardImage)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-cyan-300 hover:text-cyan-200">
                                  ID
                                </a>
                                <a href={fileUrl(seller.kycDocuments?.merchantLicenseImage)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-cyan-300 hover:text-cyan-200">
                                  License
                                </a>
                                <a href={fileUrl(seller.kycDocuments?.taxReceiptImage)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-cyan-300 hover:text-cyan-200">
                                  Tax
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                {!seller.isApproved ? (
                                  <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() =>
                                      applyStatusUpdate(seller._id, { isApproved: true, isActive: true }, `${seller.shopName} approved`)
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#04111f] text-xs font-black inline-flex items-center gap-1"
                                  >
                                    <FaCheckCircle /> Approve
                                  </button>
                                ) : null}
                                {seller.isActive ? (
                                  <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() => {
                                      const note = window.prompt('Reason for suspension (required):', '');
                                      if (note === null) return;
                                      if (!String(note).trim()) {
                                        toast.error('Suspension reason is required');
                                        return;
                                      }
                                      applyStatusUpdate(
                                        seller._id,
                                        { isActive: false, note: String(note).trim() },
                                        `${seller.shopName} suspended`
                                      );
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-black inline-flex items-center gap-1"
                                  >
                                    <FaPowerOff /> Suspend
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() => {
                                      const note = window.prompt('Reason for reactivation (required):', '');
                                      if (note === null) return;
                                      if (!String(note).trim()) {
                                        toast.error('Reactivation reason is required');
                                        return;
                                      }
                                      applyStatusUpdate(
                                        seller._id,
                                        { isActive: true, note: String(note).trim() },
                                        `${seller.shopName} reactivated`
                                      );
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#04111f] text-xs font-black inline-flex items-center gap-1"
                                  >
                                    <FaShieldAlt /> Reactivate
                                  </button>
                                )}
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

      <footer className="border-t border-white/10 bg-[#081122]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-gray-400">
          <p>Seller Management • Table Workspace</p>
          <p>© {new Date().getFullYear()} Gulit Marketplace Admin</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminSellerReviewScreen;
