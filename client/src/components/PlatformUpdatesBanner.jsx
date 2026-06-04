import React, { useState } from 'react';
import { FaBullhorn, FaTimes } from 'react-icons/fa';
import { useGetPlatformUpdatesQuery } from '../store/slices/platformApiSlice';
import RichTextMessage from './RichTextMessage';

const DISMISSED_KEY = 'dismissedPlatformUpdates';

const getDismissed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const saveDismissed = (set) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
};

const buyerBannerClass = (priority) => {
  if (priority === 'high') {
    return 'border-emerald-500/70 bg-gradient-to-r from-emerald-200 via-lime-100 to-green-200 shadow-[0_12px_35px_rgba(16,185,129,0.35)]';
  }
  if (priority === 'medium') {
    return 'border-emerald-400/70 bg-gradient-to-r from-emerald-100 via-green-50 to-lime-100 shadow-[0_10px_30px_rgba(16,185,129,0.28)]';
  }
  return 'border-green-300/80 bg-gradient-to-r from-green-100 via-lime-50 to-emerald-100 shadow-[0_8px_24px_rgba(22,163,74,0.22)]';
};

const sellerBannerClass = (priority) => {
  if (priority === 'high') return 'border-red-500/35 bg-red-500/10 text-red-100';
  if (priority === 'medium') return 'border-cyan-500/35 bg-cyan-500/10 text-cyan-100';
  return 'border-amber-500/35 bg-amber-500/10 text-amber-100';
};

const PlatformUpdatesBanner = ({ audience }) => {
  const { data, isLoading, isError } = useGetPlatformUpdatesQuery({ audience }, { skip: !audience });
  const updates = data?.updates || [];

  // Initialise from localStorage so dismissals survive refresh
  const [hiddenUpdates, setHiddenUpdates] = useState(getDismissed);

  const hideUpdate = (updateId) => {
    setHiddenUpdates(prev => {
      const next = new Set([...prev, updateId]);
      saveDismissed(next);
      return next;
    });
  };

  const visibleUpdates = updates.filter(update => !hiddenUpdates.has(update._id));

  if (isLoading || isError || visibleUpdates.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleUpdates.map((update) => (
        <div
          key={update._id}
          className={`relative overflow-hidden rounded-2xl border px-4 py-3 platform-update-enter ${
            audience === 'buyer' ? buyerBannerClass(update.priority) : sellerBannerClass(update.priority)
          }`}
        >
          {audience === 'buyer' ? <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-400/25 blur-2xl" /> : null}
          
          {/* Dismiss Button — persists to localStorage */}
          <button
            onClick={() => hideUpdate(update._id)}
            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
              audience === 'buyer' 
                ? 'hover:bg-emerald-500/20 text-emerald-700' 
                : 'hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
            aria-label="Dismiss update"
          >
            <FaTimes size={12} />
          </button>
          
          <p
            className={`relative text-xs uppercase tracking-wider font-black inline-flex items-center gap-2 ${
              audience === 'buyer' ? 'text-emerald-900' : ''
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                audience === 'buyer' ? 'bg-emerald-700 text-white animate-pulse' : ''
              }`}
            >
              <FaBullhorn />
            </span>
            Platform Update
          </p>
          <p className={`relative font-black mt-1 ${audience === 'buyer' ? 'text-emerald-950' : ''}`}>{update.title}</p>
          <RichTextMessage
            text={update.message}
            className={`relative text-sm mt-1 opacity-95 ${audience === 'buyer' ? 'text-emerald-900' : ''}`}
          />
        </div>
      ))}
    </div>
  );
};

export default PlatformUpdatesBanner;
