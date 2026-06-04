import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaGavel,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaListUl,
} from 'react-icons/fa';

const ruleCards = [
  {
    title: 'Listing Quality',
    points: ['Use original photos only', 'Accurate product titles and specs', 'No prohibited keywords or misleading claims'],
    tone: 'ok',
  },
  {
    title: 'Fulfillment Standards',
    points: ['Ship within processing time', 'Upload valid tracking details', 'Avoid seller-side cancellations'],
    tone: 'ok',
  },
  {
    title: 'Restricted Content',
    points: ['No counterfeit goods', 'No illegal/restricted products', 'No unsafe or expired inventory'],
    tone: 'warn',
  },
  {
    title: 'Conduct & Communication',
    points: ['Respectful buyer communication', 'No off-platform payment requests', 'No abusive or manipulative behavior'],
    tone: 'warn',
  },
];

const violations = [
  { level: 'Minor', action: 'Warning + listing adjustment request', icon: FaExclamationTriangle },
  { level: 'Major', action: 'Temporary listing suspension', icon: FaBan },
  { level: 'Critical', action: 'Account suspension / permanent removal', icon: FaGavel },
];

const SellerRulesCenterScreen = () => {
  return (
    <div className="min-h-[calc(100vh-160px)] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 font-bold mb-6 transition-colors">
          <FaArrowLeft /> Back
        </Link>

        <div className="rounded-[2rem] border border-amber-500/25 bg-gradient-to-br from-[#1e293b] via-[#111827] to-[#0f172a] p-8 md:p-10 shadow-2xl shadow-amber-900/20">
          <p className="text-amber-300 font-bold uppercase tracking-[0.18em] text-xs mb-3">Marketplace Governance</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
            Rules Center
          </h1>
          <p className="text-gray-300 mt-3 max-w-3xl">
            Clear operating standards designed to keep buyers safe and seller competition fair.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-full text-sm font-bold">
            <FaCheckCircle /> Last reviewed by platform compliance
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {ruleCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl border p-6 ${
                card.tone === 'warn' ? 'bg-[#1f1a1a] border-amber-500/30' : 'bg-[#1e293b] border-gray-700'
              }`}
            >
              <h2 className="text-lg font-black text-white mb-3">{card.title}</h2>
              <ul className="space-y-2">
                {card.points.map((point) => (
                  <li key={point} className="text-sm text-gray-300 flex items-start gap-2">
                    <FaListUl className="text-amber-400 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#1e293b] border border-gray-700 rounded-2xl p-6">
          <h2 className="text-xl font-black text-white mb-4">Violation Levels & Actions</h2>
          <div className="space-y-3">
            {violations.map((item) => (
              <div key={item.level} className="bg-[#0f172a] border border-gray-700 rounded-xl p-4 flex items-center gap-3">
                <item.icon className="text-red-400" />
                <div>
                  <p className="text-white font-bold">{item.level}</p>
                  <p className="text-gray-400 text-sm">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-[#111827] border border-gray-700 rounded-2xl p-6 text-gray-300 text-sm leading-relaxed">
          <p>
            Policy interpretation and enforcement decisions are managed by platform compliance. If you believe an action was
            incorrect, file a review request through Seller Support with evidence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerRulesCenterScreen;
