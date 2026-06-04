import React, { useMemo, useState } from 'react';
import { FaInbox, FaPaperPlane, FaPlusCircle, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  useCreateSellerSupportTicketMutation,
  useGetSellerSupportInboxQuery,
  useMarkSellerSupportThreadReadMutation,
  useReplySellerSupportThreadMutation,
} from '../../store/slices/sellersApiSlice';

const typeBadge = (type) => {
  if (type === 'ticket') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (type === 'broadcast') return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
};

const statusBadge = (status) => {
  if (status === 'resolved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'closed') return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
  if (status === 'in_progress') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
};

const SellerInboxScreen = () => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const { data, isLoading, isError, isFetching, refetch } = useGetSellerSupportInboxQuery();
  const [createTicket, { isLoading: creatingTicket }] = useCreateSellerSupportTicketMutation();
  const [replyThread, { isLoading: replying }] = useReplySellerSupportThreadMutation();
  const [markRead] = useMarkSellerSupportThreadReadMutation();

  const threads = data?.threads || [];
  const summary = data?.summary || { totalThreads: 0, unread: 0, open: 0 };

  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread._id) === String(selectedThreadId)) || null,
    [threads, selectedThreadId]
  );

  const handleSelectThread = async (thread) => {
    setSelectedThreadId(String(thread._id));
    if (thread.unreadBySeller) {
      try {
        await markRead(thread._id).unwrap();
      } catch (err) {
        // non-blocking
      }
    }
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    try {
      await createTicket({ subject, category, priority, message }).unwrap();
      setSubject('');
      setCategory('General');
      setPriority('medium');
      setMessage('');
      toast.success('Support ticket submitted');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to create ticket');
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0f172a]/95 via-[#111827]/95 to-[#0b1324]/95 p-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-white">
          <FaInbox className="text-cyan-300" /> Support Inbox
        </h1>
        <p className="text-gray-300 mt-2">Send support requests to admin and track replies from one inbox.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Total Threads</p>
          <p className="text-2xl font-black text-cyan-200 mt-1">{summary.totalThreads || 0}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-200">Unread</p>
          <p className="text-2xl font-black text-amber-200 mt-1">{summary.unread || 0}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Open Threads</p>
          <p className="text-2xl font-black text-emerald-200 mt-1">{summary.open || 0}</p>
        </div>
      </div>

      <form onSubmit={submitTicket} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
        <p className="font-black text-white inline-flex items-center gap-2"><FaPlusCircle className="text-cyan-300" /> Create New Ticket</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ticket subject"
            className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl text-white"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (Order, Payment, Product...)"
            className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl text-white"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl text-white"
          >
            <option value="low" className="bg-[#0b1220]">Priority: Low</option>
            <option value="medium" className="bg-[#0b1220]">Priority: Medium</option>
            <option value="high" className="bg-[#0b1220]">Priority: High</option>
          </select>
        </div>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue in detail..."
          className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl text-white"
        />
        <button
          type="submit"
          disabled={creatingTicket}
          className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#04111f] font-black inline-flex items-center gap-2 disabled:opacity-50"
        >
          <FaPaperPlane /> {creatingTicket ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-sm font-black text-white">Inbox Threads</p>
            <button type="button" onClick={refetch} className="text-xs text-gray-300 inline-flex items-center gap-1">
              <FaSync className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {isLoading ? <div className="p-4 text-sm text-gray-400">Loading inbox...</div> : null}
            {isError ? <div className="p-4 text-sm text-red-300">Failed to load inbox.</div> : null}
            {!isLoading && !isError && threads.length === 0 ? <div className="p-4 text-sm text-gray-400">No messages yet.</div> : null}
            {threads.map((thread) => (
              <button
                key={thread._id}
                type="button"
                onClick={() => handleSelectThread(thread)}
                className={`w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/[0.04] ${selectedThreadId === String(thread._id) ? 'bg-cyan-500/10' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-gray-100 truncate">{thread.subject}</p>
                  {thread.unreadBySeller ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${typeBadge(thread.threadType)}`}>{thread.threadType}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadge(thread.status)}`}>{thread.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 truncate">{thread.messages?.[thread.messages.length - 1]?.body || '-'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
          {!selectedThread ? (
            <div className="text-gray-400 text-sm">Select a thread from inbox to view messages.</div>
          ) : (
            <>
              <div className="border-b border-white/10 pb-3 mb-4">
                <p className="font-black text-white">{selectedThread.subject}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedThread.threadType === 'broadcast' ? 'Broadcast from admin' : 'Conversation with admin support'}
                </p>
              </div>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {(selectedThread.messages || []).map((msg, idx) => (
                  <div
                    key={`${selectedThread._id}-${idx}`}
                    className={`rounded-xl px-4 py-3 border ${msg.senderType === 'admin' ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}
                  >
                    <p className="text-xs uppercase tracking-wide font-black text-gray-300">{msg.senderType === 'admin' ? 'Admin' : 'You'}</p>
                    <p className="text-sm text-gray-100 mt-1 whitespace-pre-wrap">{msg.body}</p>
                    <p className="text-[11px] text-gray-500 mt-2">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {selectedThread.threadType !== 'broadcast' && (
                <div className="mt-4 space-y-2">
                  <textarea
                    rows={3}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Write reply to admin..."
                    className="w-full px-3 py-3 bg-[#020617]/80 border border-white/10 rounded-xl text-white"
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerInboxScreen;
