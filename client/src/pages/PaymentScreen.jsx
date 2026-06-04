import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { savePaymentMethod } from '../store/slices/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';
import { FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';

const PaymentScreen = () => {
  const [paymentMethod, setPaymentMethod] = useState('Chapa');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  useEffect(() => {
    if (!shippingAddress) {
      navigate('/shipping');
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod(paymentMethod));
    navigate('/placeorder');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <CheckoutSteps step1 step2 step3 />
      
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg bg-white rounded-[2rem] shadow-xl p-8 md:p-12">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Payment Method</h1>
          
          <form onSubmit={submitHandler} className="space-y-4">
            {/* Chapa Option */}
            <label className={`block border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'Chapa' ? 'border-green-500 bg-green-400' : 'border-gray-200 hover:border-green-200'}`}>
              <div className="flex items-center gap-4">
                <input 
                  type="radio" 
                  value="Chapa" 
                  checked={paymentMethod === 'Chapa'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="font-bold text-white block">Chapa (Cards / Telebirr)</span>
                  <span className="text-xs text-white">Fast & Secure</span>
                </div>
                <FaCreditCard className="text-2xl text-green-600" />
              </div>
            </label>

            {/* Cash on Delivery Option */}
            <label className={`block border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'Cash' ? 'border-green-500 bg-green-400' : 'border-gray-200 hover:border-green-200'}`}>
              <div className="flex items-center gap-4">
                <input 
                  type="radio" 
                  value="Cash" 
                  checked={paymentMethod === 'Cash'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="font-bold text-white block">Cash on Delivery</span>
                  <span className="text-xs text-white">Pay when you receive</span>
                </div>
                <FaMoneyBillWave className="text-2xl text-green-600" />
              </div>
            </label>

            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-200 mt-6 transition-all">
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;