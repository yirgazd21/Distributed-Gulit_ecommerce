import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaSearch,
  FaBoxOpen,
  FaWallet,
  FaShieldAlt,
  FaHeadset,
  FaChevronRight,
} from 'react-icons/fa';

const faqItems = [
  {
    q: 'How fast should I ship an order?',
    a: 'Ship within your configured processing time. Faster fulfillment improves visibility and customer trust.',
  },
  {
    q: 'When does wallet balance update?',
    a: 'Seller wallet credits are recorded when buyer payment is confirmed on an order.',
  },
  {
    q: 'Can I edit business identity details later?',
    a: 'Some legal fields can become locked after approval to protect marketplace compliance.',
  },
  {
    q: 'How do I improve store performance?',
    a: 'Keep response time low, fulfill on time, maintain stock accuracy, and avoid cancellations.',
  },
];

const categories = [
  { title: 'Orders & Fulfillment', icon: FaBoxOpen, desc: 'Shipping flow, delivery confirmation, cancellations, returns.' },
  { title: 'Wallet & Payouts', icon: FaWallet, desc: 'Revenue settlement, balance history, payout setup, thresholds.' },
  { title: 'Compliance & Safety', icon: FaShieldAlt, desc: 'KYC, restricted products, listing quality, policy violations.' },
  { title: 'Support Contact', icon: FaHeadset, desc: 'Escalation path, response SLA, ticket best practices.' },
];

const SellerHelpCenterScreen = () => {
  return (
    <div className="min-h-[calc(100vh-160px)] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 font-bold mb-6 transition-colors">
          <FaArrowLeft /> Back
        </Link>

        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#111827] p-8 md:p-10 shadow-2xl shadow-emerald-900/20">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
          <p className="text-emerald-300 font-bold uppercase tracking-[0.18em] text-xs mb-3">Seller Support</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
            Help Center
          </h1>
          <p className="text-gray-300 mt-3 max-w-3xl">
            Find quick guidance for day-to-day operations and platform workflows.
          </p>
          <div className="mt-6 bg-[#0b1220]/80 border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-3">
            <FaSearch className="text-emerald-400" />
            <span className="text-gray-400 text-sm">Search support articles (coming soon)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {categories.map((item) => (
            <div key={item.title} className="bg-[#1e293b] border border-gray-700 rounded-2xl p-5 hover:border-emerald-500/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <item.icon className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">{item.title}</h2>
              <p className="text-gray-400 mt-2 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#1e293b] border border-gray-700 rounded-2xl p-6">
          <h2 className="text-xl font-black text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <div key={item.q} className="bg-[#0f172a] border border-gray-700 rounded-xl p-4">
                <p className="text-white font-bold">{item.q}</p>
                <p className="text-gray-400 mt-2 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-[#111827] border border-gray-700 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold">Need direct support?</p>
            <p className="text-gray-400 text-sm mt-1">Create a support ticket with order ID, product ID, and screenshots.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0f172a] font-black px-5 py-3 rounded-xl transition-colors">
            Open Ticket <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerHelpCenterScreen;
