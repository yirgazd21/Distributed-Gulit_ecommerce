import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSellerLoginMutation, useSellerGoogleLoginMutation } from '../../store/slices/sellersApiSlice';
import { setSellerCredentials } from '../../store/slices/sellerAuthSlice';
import { toast } from 'react-toastify';
import { FaLock, FaEnvelope, FaSpinner, FaArrowRight, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import logo from '../../assets/gulit.png'; // Make sure this path is correct

const SellerLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sellerLogin, { isLoading }] = useSellerLoginMutation();
  const [sellerGoogleLogin, { isLoading: loadingGoogle }] = useSellerGoogleLoginMutation();
  const { sellerInfo } = useSelector((state) => state.sellerAuth);
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (sellerInfo) {
      if (sellerInfo.isApproved) {
        navigate('/seller/dashboard');
      } else {
        navigate('/seller/pending');
      }
    }
  }, [navigate, sellerInfo]);

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await sellerGoogleLogin({ credential: response.credential }).unwrap();
            dispatch(setSellerCredentials({ ...res }));
            if (res.isApproved) {
              navigate('/seller/dashboard');
              toast.success('Welcome back to your workspace!');
            } else {
              navigate('/seller/pending');
            }
          } catch (err) {
            toast.error(err?.data?.message || err.error);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'signin_with',
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', initGoogle);
      return () => existing.removeEventListener('load', initGoogle);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = initGoogle;
    document.body.appendChild(script);
  }, [dispatch, googleClientId, navigate, sellerGoogleLogin]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await sellerLogin({ email, password }).unwrap();
      dispatch(setSellerCredentials({ ...res }));
      
      if (res.isApproved) {
        navigate('/seller/dashboard');
        toast.success('Welcome back to your workspace!');
      } else {
        navigate('/seller/pending');
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f172a] font-sans relative overflow-hidden">
      
      {/* =======================================
          LEFT SIDE: Branding & Slogan (Hidden on Mobile)
          ======================================= */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">
        {/* Background Image with Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=80')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/95 via-[#0f172a]/80 to-green-900/40 z-0"></div>

        {/* Content */}
        <div className="relative z-10">
          <Link to="/sell" className="flex items-center gap-3">
            <img src={logo} alt="Gulit Logo" className="w-12 h-12 object-contain" />
            <span className="text-3xl font-black text-white tracking-tight">
              Gulit <span className="text-green-500 font-medium">Seller Center</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="inline-block bg-green-500/20 text-green-400 font-bold px-4 py-1.5 rounded-full text-sm uppercase tracking-widest mb-6 border border-green-500/30">
            Empowering Ethiopian Merchants
          </div>
          <h1 className="text-5xl font-black text-white mb-6 leading-tight">
            Turn your local shop into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">nationwide brand.</span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Manage your inventory, fulfill orders, and withdraw earnings directly to your local bank account. Your business, amplified.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="relative z-10 flex gap-4">
          <div className="w-16 h-1.5 bg-green-500 rounded-full"></div>
          <div className="w-8 h-1.5 bg-gray-600 rounded-full"></div>
          <div className="w-8 h-1.5 bg-gray-600 rounded-full"></div>
        </div>
      </div>

      {/* =======================================
          RIGHT SIDE: Login Form
          ======================================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        
        {/* Mobile-only logo */}
        <div className="absolute top-8 left-6 lg:hidden flex items-center gap-2">
          <img src={logo} alt="Gulit Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-black text-white tracking-tight">
            Gulit <span className="text-green-500">Seller</span>
          </span>
        </div>

        <div className="max-w-md w-full bg-[#1e293b]/50 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
          
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-gray-400 font-medium mb-8">Sign in to your seller workspace.</p>

          <form onSubmit={submitHandler} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-500" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-green-500 transition-colors" 
                  placeholder="name@business.com" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-400">Password</label>
                
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-500" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl pl-11 pr-12 py-3.5 text-white focus:outline-none focus:border-green-500 transition-colors" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/seller/forgot-password" className="text-1xl font-bold text-green-500 hover:text-green-400 transition-colors align-bottom">Forgot password?</Link>
              </div>
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-400 text-[#0f172a] font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] disabled:bg-gray-600 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-3 mt-2"
            >
              {isLoading ? <FaSpinner className="animate-spin" /> : <>Sign In <FaArrowRight /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium">Or continue with</span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>

          {/* Google Sign In Button */}
          <div className="mt-6">
            {googleClientId ? (
              <div className="flex justify-center">
                <div ref={googleBtnRef} className={loadingGoogle ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            ) : (
              <button
                type="button"
                className="w-full bg-white text-gray-400 font-bold text-lg py-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center gap-3"
              >
                <FaGoogle className="text-red-500 text-xl" /> Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-in
              </button>
            )}
          </div>

          <div className="mt-8 text-center border-t border-gray-700/50 pt-6">
            <p className="text-gray-400 text-sm font-medium">
              Don't have a seller account?{' '}
              <Link to="/seller/register" className="text-green-500 hover:text-green-400 font-bold transition-colors">Apply to sell</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SellerLoginScreen;
