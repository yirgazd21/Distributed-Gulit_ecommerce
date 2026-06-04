import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaLock } from 'react-icons/fa';
import { useResetPasswordMutation } from '../store/slices/usersApiSlice';

const ResetPasswordScreen = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const res = await resetPassword({ token, password }).unwrap();
      toast.success(res.message || 'Password reset successful');
      navigate('/login');
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
        <h1 className="text-3xl font-black mb-2 text-gray-900">Reset Password</h1>
        <p className="text-gray-500 mb-6">Create a new password for your account.</p>
        <form onSubmit={submitHandler} className="space-y-4">
          <label className="block text-sm font-bold text-gray-600">New Password</label>
          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
            />
          </div>
          <label className="block text-sm font-bold text-gray-600">Confirm Password</label>
          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3.5 rounded-xl transition-colors disabled:opacity-70"
          >
            {isLoading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
