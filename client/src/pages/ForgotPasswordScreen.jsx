import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEnvelope, FaKey } from 'react-icons/fa';
import { useForgotPasswordMutation, useVerifyResetCodeMutation } from '../store/slices/usersApiSlice';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const navigate = useNavigate();
  const [forgotPassword, { isLoading: isSending }] = useForgotPasswordMutation();
  const [verifyResetCode, { isLoading: isVerifying }] = useVerifyResetCodeMutation();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await forgotPassword({ email }).unwrap();
      toast.success(res.message || 'Reset code sent to your email');
      setCodeRequested(true);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const verifyHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await verifyResetCode({ email, code }).unwrap();
      toast.success(res.message || 'Code verified');
      navigate(`/reset-password/${code}`);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-8">
        <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-green-600 font-bold mb-6">
          <FaArrowLeft /> Back to Login
        </Link>
        <h1 className="text-3xl font-black mb-2 text-gray-900">Forgot Password</h1>
        <p className="text-gray-500 mb-6">Enter your email to receive a 6-digit reset code.</p>
        <form onSubmit={codeRequested ? verifyHandler : submitHandler} className="space-y-4">
          <label className="block text-sm font-bold text-gray-600">Email</label>
          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={codeRequested}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 disabled:opacity-60"
            />
          </div>

          {codeRequested && (
            <>
              <label className="block text-sm font-bold text-gray-600">Reset Code</label>
              <div className="relative">
                <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSending || isVerifying}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3.5 rounded-xl transition-colors disabled:opacity-70"
          >
            {isSending || isVerifying
              ? 'Processing...'
              : codeRequested
              ? 'Verify Code & Reset'
              : 'Send Reset Code'}
          </button>
        </form>

        <div className="mt-6 bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-sm text-green-700 font-bold">
            {codeRequested ? 'Code sent. Enter it above to continue.' : 'Check your inbox for the reset code.'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If you don’t receive an email, check your spam folder or try again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
