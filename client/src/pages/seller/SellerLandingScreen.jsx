import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaStore, FaChartLine, FaShieldAlt, FaMoneyCheckAlt, 
  FaArrowRight, FaStar, FaQuoteLeft, FaRocket
} from 'react-icons/fa';

const SellerLandingScreen = () => {
  return (
    <div className="w-full relative overflow-hidden bg-[#0f172a]">
      
      {/* 🌟 HERO SECTION */}
      <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-40 px-6 border-b border-gray-800">
        {/* Animated Background Glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-[#1e293b] border border-gray-700 text-green-400 font-bold px-5 py-2 rounded-full text-sm uppercase tracking-widest mb-8 shadow-lg">
            <FaRocket className="text-green-500" /> Join 5,000+ Ethiopian Merchants
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tight">
            Elevate Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-blue-500">
              Local Business.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl leading-relaxed font-light">
            Expand beyond your physical storefront. Reach millions of active buyers nationwide, manage inventory seamlessly, and get paid instantly to your local bank.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Link 
              to="/seller/register" 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-lg px-10 py-5 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3 group"
            >
              Start Selling Today <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/seller/login" 
              className="bg-[#1e293b] hover:bg-gray-800 border border-gray-700 hover:border-green-500/50 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all flex items-center justify-center hover:-translate-y-1 shadow-xl"
            >
              Seller Login
            </Link>
          </div>
        </div>
      </section>

      {/* 📈 STATS STRIP */}
      <section className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] py-12 border-b border-gray-800 relative z-20">
        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-800/50">
          {[
            { value: "1M+", label: "Active Shoppers" },
            { value: "5,000+", label: "Verified Sellers" },
            { value: "48h", label: "Average Payout Time" },
            { value: "0 ETB", label: "Setup Fee", highlight: true }
          ].map((stat, idx) => (
            <div key={idx}>
              <h4 className={`text-4xl md:text-5xl font-black ${stat.highlight ? 'text-green-400' : 'text-white'} drop-shadow-md`}>
                {stat.value}
              </h4>
              <p className="text-sm md:text-base text-gray-500 mt-2 font-bold uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🚀 WHY SELL ON GULIT SECTION (Glassmorphism Cards) */}
      <section className="py-32 px-6 relative bg-[#0f172a]">
        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Enterprise Tools for <br/> <span className="text-green-400">Everyday Merchants</span></h2>
            <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto">We provide the infrastructure so you can focus on what you do best: selling great products.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#1e293b]/50 backdrop-blur-sm p-10 rounded-[2.5rem] border border-gray-700/50 hover:border-green-500/50 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.15)] group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mb-8 border border-gray-700 shadow-inner">
                <FaChartLine className="text-4xl text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Massive Reach</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Expand your customer base beyond your physical store. Put your products in front of thousands of active daily shoppers across the country instantly.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1e293b]/50 backdrop-blur-sm p-10 rounded-[2.5rem] border border-gray-700/50 hover:border-green-500/50 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.15)] group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mb-8 border border-gray-700 shadow-inner">
                <FaMoneyCheckAlt className="text-4xl text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Secure Local Payments</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                With our integrated local wallet, payments from CBE, Telebirr, and Chapa are held securely and transferred directly to your bank account without hassle.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1e293b]/50 backdrop-blur-sm p-10 rounded-[2.5rem] border border-gray-700/50 hover:border-green-500/50 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.15)] group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mb-8 border border-gray-700 shadow-inner">
                <FaShieldAlt className="text-4xl text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Trusted Platform</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Our strict KYC verification ensures a safe environment. Build trust with buyers through verified merchant badges and genuine customer reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 📋 HOW IT WORKS SECTION */}
      <section className="py-32 px-6 bg-[#1e293b] border-y border-gray-800 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-center text-white mb-24 tracking-tight">Your Journey to Success</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
            <div className="hidden md:block absolute top-[3.5rem] left-16 w-[calc(100%-8rem)] h-1 bg-gradient-to-r from-green-500/20 via-green-500 to-blue-500/20 z-0"></div>

            {[
              { step: 1, title: 'Register', desc: 'Submit your business details, ID, and trade license.' },
              { step: 2, title: 'List Products', desc: 'Upload your catalog with high-quality images and prices.' },
              { step: 3, title: 'Fulfill Orders', desc: 'Receive notifications, pack items, and mark as delivered.' },
              { step: 4, title: 'Get Paid', desc: 'Earnings are credited to your secure seller wallet.' }
            ].map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-28 h-28 rounded-full bg-[#0f172a] border-4 border-gray-700 group-hover:border-green-400 text-green-400 font-black text-4xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:shadow-green-500/30 group-hover:scale-110">
                  0{item.step}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏁 BOTTOM CTA */}
      <section className="py-32 px-6 text-center bg-[#0f172a]">
        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-2xl border border-gray-800">
           {/* Abstract Orbs */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
           <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
           
           <FaStore className="text-7xl text-green-400 mx-auto mb-8 relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
           <h2 className="text-4xl md:text-6xl font-black text-white mb-8 relative z-10 tracking-tight">Ready to grow your business?</h2>
           <p className="text-gray-400 text-xl mb-12 relative z-10 max-w-2xl mx-auto leading-relaxed">Join the digital revolution. Create your store in minutes and start reaching customers nationwide today.</p>
           
           <Link 
              to="/seller/register" 
              className="inline-block bg-green-500 hover:bg-green-400 text-gray-900 font-black text-xl px-14 py-6 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)] hover:shadow-[0_0_60px_-15px_rgba(34,197,94,0.8)] hover:-translate-y-2 relative z-10"
            >
              Create Your Free Account
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SellerLandingScreen;