import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaGoogle, FaEnvelope, FaLock, FaShieldAlt } from 'react-icons/fa';
import {
  useAdminLoginMutation,
  useAdminGoogleLoginMutation,
} from '../slices/adminApiSlice';
import { setAdminCredentials } from '../slices/adminAuthSlice';
import logo from '../../assets/gulit.png';
import ThemeToggle from '../../components/ThemeToggle';

const AdminLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { adminInfo } = useSelector((state) => state.adminAuth);
  const [adminLogin, { isLoading }] = useAdminLoginMutation();
  const [adminGoogleLogin, { isLoading: loadingGoogle }] = useAdminGoogleLoginMutation();
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (adminInfo) navigate('/admin/dashboard');
  }, [adminInfo, navigate]);

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await adminGoogleLogin({
              credential: response.credential,
            }).unwrap();
            dispatch(setAdminCredentials(res));
            toast.success('Logged in with Google');
            navigate('/admin/dashboard');
          } catch (err) {
            toast.error(err?.data?.message || err.error);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 380,
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
  }, [adminGoogleLogin, dispatch, googleClientId, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await adminLogin({ email, password }).unwrap();
      dispatch(setAdminCredentials(res));
      toast.success('Admin login successful');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1020] text-white flex items-center justify-center px-4 py-10 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0a1020] overflow-hidden shadow-2xl shadow-cyan-900/20 grid grid-cols-1 md:grid-cols-2">
        <div className="p-10 md:p-12 border-b md:border-b-0 md:border-r border-gray-800">
          <div className="inline-flex items-center gap-3 mb-8">
            <img src={logo} alt="Gulit" className="w-12 h-12 object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Control Panel</p>
              <h1 className="text-2xl font-black">Gulit Admin</h1>
            </div>
          </div>
          <h2 className="text-3xl font-black leading-tight mb-4">Secure Access for Marketplace Operations</h2>
          <p className="text-gray-400">
            Manage verification, marketplace policies, risk monitoring, and platform-wide decisions.
          </p>
          <div className="mt-8 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
            <p className="text-cyan-200 text-sm flex items-center gap-2">
              <FaShieldAlt /> Admin endpoints are restricted to users with `role: 'admin'`.
            </p>
          </div>
        </div>

        <div className="p-10 md:p-12">
          <h3 className="text-2xl font-black mb-6">Sign In</h3>
          <form onSubmit={submitHandler} className="space-y-4">
            <label className="block text-sm font-bold text-gray-400">Admin Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0b1220] border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-400"
              />
            </div>

            <label className="block text-sm font-bold text-gray-400">Password</label>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0b1220] border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end">
              <Link to="/admin/forgot-password" className="text-1xl text-cyan-300 hover:text-cyan-200 font-bold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#09111f] font-black py-3.5 rounded-xl transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Signing In...' : 'Admin Sign In'}
            </button>
          </form>

          <div className="my-6 border-t border-gray-800 pt-6">
            {googleClientId ? (
              <div className="flex justify-center">
                <div ref={googleBtnRef} className={loadingGoogle ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            ) : (
              <div className="w-full inline-flex items-center justify-center gap-3 bg-[#0b1220] border border-gray-700 text-gray-400 font-bold py-3.5 rounded-xl">
                <FaGoogle className="text-red-400" />
                Google login disabled: set `VITE_GOOGLE_CLIENT_ID`
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginScreen;
