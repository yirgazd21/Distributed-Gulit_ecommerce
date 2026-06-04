import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginMutation, useGoogleAuthMutation } from '../store/slices/usersApiSlice';
import { setCredentials } from '../store/slices/authSlice';
import { clearCartItems, loadCartFromDB } from '../store/slices/cartSlice';
import { usersApiSlice } from '../store/slices/usersApiSlice';
import { toast } from 'react-toastify';
import { FaGoogle, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import logo from '../assets/gulit.png';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { search } = useLocation();

  // Redirect logic: If user was trying to buy, go back there after login
  const sp = new URLSearchParams(search);
  const redirect = sp.get('redirect') || '/';

  const [login, { isLoading }] = useLoginMutation();
  const [googleAuth, { isLoading: loadingGoogle }] = useGoogleAuthMutation();
  const { userInfo } = useSelector((state) => state.auth);
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await googleAuth({ credential: response.credential }).unwrap();
            dispatch(clearCartItems());
            dispatch(setCredentials({ ...res }));
            // Load this user's cart from DB
            try {
              const cartData = await dispatch(
                usersApiSlice.endpoints.getCart.initiate(undefined, { forceRefetch: true })
              ).unwrap();
              dispatch(loadCartFromDB(cartData));
            } catch (_) {}
            toast.success('Welcome back!');
            navigate(redirect);
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
  }, [dispatch, googleAuth, googleClientId, navigate, redirect]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();
      dispatch(clearCartItems());
      dispatch(setCredentials({ ...res }));
      // Load this user's cart from DB
      const cartData = await dispatch(
        usersApiSlice.endpoints.getCart.initiate(undefined, { forceRefetch: true })
      ).unwrap();
      dispatch(loadCartFromDB(cartData));
      toast.success('Welcome back!');
      navigate(redirect);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* 🎨 LEFT SIDE: BRAND VISUAL */}
        <div className="hidden md:flex md:w-1/2 bg-green-900 relative flex-col justify-center items-center text-white p-12">
          <div className="absolute inset-0 bg-tibeb-pattern opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-black/60"></div>
          
          <div className="relative z-10 text-center space-y-6">
            <img src={logo} alt="Gulit" className="h-32 w-auto mx-auto drop-shadow-2xl" />
            <div>
              <h2 className="text-4xl font-black tracking-tight">Welcome Back</h2>
              <p className="text-green-100 mt-2 text-lg">Your gateway to Ethiopia's modern marketplace.</p>
            </div>
          </div>
        </div>

        {/* 📝 RIGHT SIDE: LOGIN FORM */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-black text-gray-900">Sign In</h2>
            <p className="text-sm text-gray-500 mt-2">
              New to Gulit? <Link to={redirect ? `/register?redirect=${redirect}` : '/register'} className="text-green-600 font-bold hover:underline">Create an account</Link>
            </p>
          </div>

          <form onSubmit={submitHandler} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:bg-white transition-colors font-medium"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:bg-white transition-colors font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-1xl font-bold text-gray-500 hover:text-green-600">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-200 transition-all active:scale-95 disabled:bg-gray-300"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Button */}
          {googleClientId ? (
            <div className="flex justify-center">
              <div ref={googleBtnRef} className={loadingGoogle ? 'opacity-60 pointer-events-none' : ''} />
            </div>
          ) : (
            <button type="button" className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-400 py-3.5 rounded-xl font-bold transition-all">
              <FaGoogle className="text-red-500" />
              <span>Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-in</span>
            </button>
          )}
          
          {/* Seller Link */}
           <div className="mt-8 text-center border-t border-gray-50 pt-6">
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Want to sell on Gulit?</p>
             <Link to="/seller-landing" className="text-green-600 font-bold hover:underline text-sm">
                Open your shop here
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
