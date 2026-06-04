import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaBullhorn,
  FaEnvelope,
  FaPaperPlane,
  FaSearch,
  FaSignOutAlt,
  FaSync,
  FaUser,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../../assets/gulit.png';
import AdminSidebar from '../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { adminLogout } from '../slices/adminAuthSlice';
import {
  useAdminGetSellersQuery,
  useAdminGetSupportInboxQuery,
  useAdminReplySupportThreadMutation,
  useAdminSendSupportMessageMutation,
  useAdminUpdateSupportThreadStatusMutation,
} from '../slices/adminApiSlice';

const badgeType = (type) => {
  if (type === 'ticket') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (type === 'broadcast') return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
};

const badgeStatus = (status) => {
  if (status === 'resolved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'closed') return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
  if (status === 'in_progress') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
};

const AdminSupportDeskScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [page] = useState(1);
  const [limit] = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');

  const [composeMode, setComposeMode] = useState('seller');
  const [targetSellerId, setTargetSellerId] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composePriority, setComposePriority] = useState('medium');

  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const { data, isLoading, isError, isFetching, refetch } = useAdminGetSupportInboxQuery({
    page,
    limit,
    keyword,
    type,
    status,
  });
  const { data: sellersData } = useAdminGetSellersQuery({ page: 1, limit: 100, status: 'all' });

  const [sendMessage, { isLoading: sendingMessage }] = useAdminSendSupportMessageMutation();
  const [replyThread, { isLoading: replying }] = useAdminReplySupportThreadMutation();
  const [updateThreadStatus, { isLoading: updatingStatus }] = useAdminUpdateSupportThreadStatusMutation();

  const threads = data?.threads || [];
  const sellers = sellersData?.sellers || [];
  const summary = data?.summary || { totalThreads: 0, unreadForAdmin: 0, openThreads: 0, ticketThreads: 0 };

  const selectedThread = useMemo(
    () => threads.find((item) => String(item._id) === String(selectedThreadId)) || null,
    [threads, selectedThreadId]
  );

  useEffect(() => {
    if (!selectedThreadId && threads[0]) {
      setSelectedThreadId(String(threads[0]._id));
    }
    if (selectedThreadId && !threads.some((item) => String(item._id) === String(selectedThreadId))) {
      setSelectedThreadId(threads[0]?._id ? String(threads[0]._id) : '');
    }
  }, [threads, selectedThreadId]);

  const logoutHandler = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
  };

  const submitCompose = async (e) => {
    e.preventDefault();
    if (composeMode === 'seller' && !targetSellerId) {
      toast.error('Select a seller for direct message');
      return;
    }
    try {
      await sendMessage({
        mode: composeMode,
        sellerId: targetSellerId,
        subject: composeSubject,
        message: composeMessage,
        priority: composePriority,
      }).unwrap();
      toast.success(composeMode === 'broadcast' ? 'Broadcast sent' : 'Message sent to seller');
      setComposeSubject('');
      setComposeMessage('');
      if (composeMode === 'seller') setTargetSellerId('');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to send message');
    }
  };

  const submitReply = async () => {
    if (!selectedThread) return;
    if (!replyMessage.trim()) {
      toast.error('Reply message is required');
      return;
    }
    try {
      await replyThread({ threadId: selectedThread._id, message: replyMessage.trim() }).unwrap();
      setReplyMessage('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to send reply');
    }
  };

  const changeStatus = async (nextStatus) => {
    if (!selectedThread) return;
    try {
      await updateThreadStatus({ threadId: selectedThread._id, status: nextStatus }).unwrap();
      toast.success('Thread status updated');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to update status');
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
              <p className="text-lg font-black text-gray-100">Support Inbox</p>
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
          <AdminSidebar activeKey="support" />
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <FaEnvelope className="text-cyan-300" /> Seller Support Inbox
              </h1>
              <p className="text-gray-300 mt-2">Receive seller tickets, reply directly, and send broadcast/platform messages.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-200">Total Threads</p>
                <p className="text-2xl font-black text-cyan-100 mt-1">{summary.totalThreads || 0}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-200">Unread for Admin</p>
                <p className="text-2xl font-black text-amber-100 mt-1">{summary.unreadForAdmin || 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Open Threads</p>
                <p className="text-2xl font-black text-emerald-100 mt-1">{summary.openThreads || 0}</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-200">Tickets</p>
                <p className="text-2xl font-black text-violet-100 mt-1">{summary.ticketThreads || 0}</p>
              </div>
            </div>

            <form onSubmit={submitCompose} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-gray-100 flex items-center gap-2"><FaBullhorn className="text-cyan-300" /> Compose Message</p>
                <select
                  value={composeMode}
                  onChange={(e) => setComposeMode(e.target.value)}
                  className="px-3 py-2 bg-[#020617]/80 border border-white/10 rounded-xl"
                >
                  <option value="seller" className="bg-[#0b1220]">Direct to Seller</option>
                  <option value="broadcast" className="bg-[#0b1220]">Broadcast to All Sellers</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {composeMode === 'seller' ? (
                  <select
                    value={targetSellerId}
                    onChange={(e) => setTargetSellerId(e.target.value)}
                    className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                  >
                    <option value="" className="bg-[#0b1220]">Select seller</option>
                    {sellers.map((seller) => (
                      <option key={seller._id} value={seller._id} className="bg-[#0b1220]">
                        {seller.shopName} ({seller.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-3 rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-200 text-sm">
                    Broadcast will be delivered to every seller inbox.
                  </div>
                )}
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Message subject"
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                />
                <select
                  value={composePriority}
                  onChange={(e) => setComposePriority(e.target.value)}
                  className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                >
                  <option value="low" className="bg-[#0b1220]">Priority: Low</option>
                  <option value="medium" className="bg-[#0b1220]">Priority: Medium</option>
                  <option value="high" className="bg-[#0b1220]">Priority: High</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Write message details..."
                className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
              />
              <button
                type="submit"
                disabled={sendingMessage}
                className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black inline-flex items-center gap-2 disabled:opacity-50"
              >
                <FaPaperPlane /> {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            <form onSubmit={submitSearch} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by subject, seller, email, or text..."
                    className="w-full pl-10 pr-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                  />
                </div>
                <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Type: All</option>
                  <option value="ticket" className="bg-[#0b1220]">Ticket</option>
                  <option value="direct" className="bg-[#0b1220]">Direct</option>
                  <option value="broadcast" className="bg-[#0b1220]">Broadcast</option>
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl">
                  <option value="all" className="bg-[#0b1220]">Status: All</option>
                  <option value="open" className="bg-[#0b1220]">Open</option>
                  <option value="in_progress" className="bg-[#0b1220]">In Progress</option>
                  <option value="resolved" className="bg-[#0b1220]">Resolved</option>
                  <option value="closed" className="bg-[#0b1220]">Closed</option>
                </select>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black">Search</button>
                <button type="button" onClick={refetch} className="px-4 py-2.5 rounded-xl border border-white/15 text-gray-200 inline-flex items-center gap-2">
                  <FaSync className={isFetching ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
            </form>

            {isLoading ? <div className="bg-[#0f172a] border border-white/10 rounded-xl p-4 text-gray-300">Loading inbox...</div> : null}
            {isError ? <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-200">Failed to load support inbox.</div> : null}

            {!isLoading && !isError && (
              <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-black text-gray-200">Threads</div>
                  <div className="max-h-[620px] overflow-y-auto">
                    {threads.length === 0 ? (
                      <div className="p-6 text-sm text-gray-400">No threads found for this filter.</div>
                    ) : (
                      threads.map((thread) => (
                        <button
                          key={thread._id}
                          type="button"
                          onClick={() => setSelectedThreadId(String(thread._id))}
                          className={`w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/[0.04] ${selectedThreadId === String(thread._id) ? 'bg-cyan-500/10' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-black text-gray-100 truncate">{thread.subject}</p>
                            {thread.unreadByAdmin ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeType(thread.threadType)}`}>{thread.threadType}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeStatus(thread.status)}`}>{thread.status}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 truncate inline-flex items-center gap-1">
                            <FaUser /> {thread.sellerName || 'All Sellers'} {thread.sellerEmail ? `(${thread.sellerEmail})` : ''}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{thread.lastMessage?.body || '-'}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                  {!selectedThread ? (
                    <div className="text-gray-400 text-sm">Select a thread to review messages.</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                        <div>
                          <p className="font-black text-gray-100">{selectedThread.subject}</p>
                          <p className="text-xs text-gray-400 mt-1">{selectedThread.sellerName || 'All sellers'} {selectedThread.sellerEmail ? `(${selectedThread.sellerEmail})` : ''}</p>
                        </div>
                        <select
                          value={selectedThread.status}
                          onChange={(e) => changeStatus(e.target.value)}
                          disabled={updatingStatus}
                          className="px-3 py-2 bg-[#020617]/80 border border-white/10 rounded-xl"
                        >
                          <option value="open" className="bg-[#0b1220]">Open</option>
                          <option value="in_progress" className="bg-[#0b1220]">In Progress</option>
                          <option value="resolved" className="bg-[#0b1220]">Resolved</option>
                          <option value="closed" className="bg-[#0b1220]">Closed</option>
                        </select>
                      </div>

                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {(selectedThread.messages || []).map((msg, idx) => (
                          <div
                            key={`${selectedThread._id}-${idx}`}
                            className={`rounded-xl px-4 py-3 border ${msg.senderType === 'admin' ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}
                          >
                            <p className="text-xs uppercase tracking-wide font-black text-gray-300">{msg.senderType === 'admin' ? 'Admin' : 'Seller'}</p>
                            <p className="text-sm text-gray-100 mt-1 whitespace-pre-wrap">{msg.body}</p>
                            <p className="text-[11px] text-gray-500 mt-2">{new Date(msg.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 space-y-2">
                        <textarea
                          rows={3}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Write reply..."
                          className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl"
                        />
                        <button
                          type="button"
                          disabled={replying}
                          onClick={submitReply}
                          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <FaPaperPlane /> {replying ? 'Sending...' : 'Reply'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminSupportDeskScreen;
