import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaSignOutAlt, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import {
  useAdminCreatePlatformUpdateMutation,
  useAdminCreateCategoryMutation,
  useAdminGetCategoriesQuery,
  useAdminGetPlatformUpdatesQuery,
  useAdminUpdateCategoryMutation,
  useAdminUpdatePlatformUpdateMutation,
} from '../slices/adminApiSlice';
import RichTextMessage from '../../components/RichTextMessage';

const AdminSystemSettingsScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [audienceFilter, setAudienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('buyer');
  const [priority, setPriority] = useState('medium');
  const [isActive, setIsActive] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categorySubcategories, setCategorySubcategories] = useState('');

  const { data, isLoading, isError, isFetching, refetch } = useAdminGetPlatformUpdatesQuery({
    audience: audienceFilter,
    status: statusFilter,
    page: 1,
    limit: 40,
  });
  const [createUpdate, { isLoading: creating }] = useAdminCreatePlatformUpdateMutation();
  const [updateStatus, { isLoading: updating }] = useAdminUpdatePlatformUpdateMutation();
  const { data: categoryData, isLoading: loadingCategories } = useAdminGetCategoriesQuery();
  const [createCategory, { isLoading: creatingCategory }] = useAdminCreateCategoryMutation();
  const [updateCategory, { isLoading: updatingCategory }] = useAdminUpdateCategoryMutation();

  const updates = data?.updates || [];
  const categories = categoryData?.categories || [];

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      toast.error('End date/time must be after start date/time');
      return;
    }
    try {
      await createUpdate({
        title,
        message,
        audience,
        priority,
        isActive,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
      }).unwrap();
      setTitle('');
      setMessage('');
      setAudience('buyer');
      setPriority('medium');
      setIsActive(true);
      setStartAt('');
      setEndAt('');
      toast.success('Platform update published');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to create update');
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateStatus({ updateId: item._id, isActive: !item.isActive }).unwrap();
      toast.success(`Update ${!item.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update status');
    }
  };

  const parseSubcategories = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      await createCategory({
        name: categoryName,
        subcategories: parseSubcategories(categorySubcategories),
      }).unwrap();
      setCategoryName('');
      setCategorySubcategories('');
      toast.success('Category created');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to create category');
    }
  };

  const saveSubcategories = async (category) => {
    const nextValue = window.prompt(
      `Comma-separated subcategories for ${category.name}`,
      (category.subcategories || []).map((item) => item.name).join(', ')
    );
    if (nextValue === null) return;
    try {
      await updateCategory({
        categoryId: category._id,
        subcategories: parseSubcategories(nextValue),
      }).unwrap();
      toast.success('Subcategories updated');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update subcategories');
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
              <p className="text-lg font-black text-gray-100">System Settings</p>
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
          <AdminSidebar activeKey="system-settings" />
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <FaCog className="text-cyan-300" /> Platform Updates
              </h1>
              <p className="text-gray-300 mt-2">Publish buyer/seller announcements and control visibility.</p>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-4">
              <div>
                <p className="font-black text-gray-100">Product Categories</p>
                <p className="text-sm text-gray-400 mt-1">Manage the approved categories and subcategories sellers must choose from.</p>
              </div>

              <form onSubmit={submitCategory} className="grid grid-cols-1 lg:grid-cols-[240px_1fr_auto] gap-3">
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                />
                <input
                  value={categorySubcategories}
                  onChange={(e) => setCategorySubcategories(e.target.value)}
                  placeholder="Subcategories, comma separated"
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                />
                <button type="submit" disabled={creatingCategory} className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04111f] font-black disabled:opacity-50">
                  {creatingCategory ? 'Adding...' : 'Add Category'}
                </button>
              </form>

              {loadingCategories ? (
                <p className="text-sm text-gray-400">Loading categories...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <div key={category._id} className="rounded-xl border border-white/10 bg-[#020617]/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-gray-100">{category.name}</p>
                          <p className="text-xs text-gray-500">{category.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                        <button
                          type="button"
                          disabled={updatingCategory}
                          onClick={() => updateCategory({ categoryId: category._id, isActive: !category.isActive })}
                          className="text-xs font-black text-cyan-200 hover:text-cyan-100"
                        >
                          {category.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(category.subcategories || []).map((subcategory) => (
                          <span key={subcategory.name} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">
                            {subcategory.name}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => saveSubcategories(category)}
                        className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-gray-200 hover:bg-white/5"
                      >
                        Edit Subcategories
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={submitCreate} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="font-black text-gray-100">Create New Update</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl" />
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="buyer" className="bg-[#0b1220]">Audience: Buyers</option>
                  <option value="seller" className="bg-[#0b1220]">Audience: Sellers</option>
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="low" className="bg-[#0b1220]">Priority: Low</option>
                  <option value="medium" className="bg-[#0b1220]">Priority: Medium</option>
                  <option value="high" className="bg-[#0b1220]">Priority: High</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-gray-300 space-y-1">
                  <span>Start at (optional)</span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                  />
                </label>
                <label className="text-sm text-gray-300 space-y-1">
                  <span>End at (optional)</span>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                  />
                </label>
              </div>
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Announcement message..." className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl" />
              <p className="text-xs text-gray-400">
                Rich text supported: `**bold**`, `*italic*`, `- bullet`, `[link](https://...)`
              </p>
              <div className="rounded-xl border border-white/10 bg-[#020617]/60 p-3">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Preview</p>
                {message ? (
                  <RichTextMessage text={message} className="text-sm text-gray-200" />
                ) : (
                  <p className="text-sm text-gray-500">Announcement preview appears here.</p>
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active immediately
              </label>
              <div>
                <button type="submit" disabled={creating} className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black disabled:opacity-50">
                  {creating ? 'Publishing...' : 'Publish Update'}
                </button>
              </div>
            </form>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-black text-gray-100">Published Updates</p>
                <div className="flex gap-2">
                  <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} className="px-3 py-2 bg-[#020617]/80 border border-white/10 rounded-xl">
                    <option value="all" className="bg-[#0b1220]">Audience: All</option>
                    <option value="buyer" className="bg-[#0b1220]">Buyers</option>
                    <option value="seller" className="bg-[#0b1220]">Sellers</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#020617]/80 border border-white/10 rounded-xl">
                    <option value="all" className="bg-[#0b1220]">Status: All</option>
                    <option value="active" className="bg-[#0b1220]">Active</option>
                    <option value="inactive" className="bg-[#0b1220]">Inactive</option>
                  </select>
                  <button onClick={refetch} type="button" className="px-3 py-2 border border-white/15 rounded-xl inline-flex items-center gap-2 text-gray-200">
                    <FaSync className={isFetching ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>

              {isLoading ? <div className="text-gray-400 text-sm">Loading updates...</div> : null}
              {isError ? <div className="text-red-300 text-sm">Failed to load updates.</div> : null}
              {!isLoading && !isError && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Title</th>
                        <th className="px-3 py-2 text-left">Audience</th>
                        <th className="px-3 py-2 text-left">Priority</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Schedule</th>
                        <th className="px-3 py-2 text-left">Created</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No updates found.</td></tr>
                      ) : (
                        updates.map((item) => (
                          <tr key={item._id} className="border-b border-white/5">
                            <td className="px-3 py-3">
                              <p className="font-black text-gray-100">{item.title}</p>
                              <RichTextMessage text={item.message} className="text-xs text-gray-500 mt-1 line-clamp-2" />
                            </td>
                            <td className="px-3 py-3 text-sm capitalize">{item.audience}</td>
                            <td className="px-3 py-3 text-sm capitalize">{item.priority}</td>
                            <td className="px-3 py-3 text-sm">{item.isActive ? 'Active' : 'Inactive'}</td>
                            <td className="px-3 py-3 text-xs text-gray-400">
                              <p>Start: {item.startAt ? new Date(item.startAt).toLocaleString() : '-'}</p>
                              <p>End: {item.endAt ? new Date(item.endAt).toLocaleString() : 'No end'}</p>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-400">{new Date(item.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => toggleActive(item)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black ${item.isActive ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}
                              >
                                {item.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminSystemSettingsScreen;
