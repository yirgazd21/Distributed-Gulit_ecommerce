import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { saveShippingAddress } from '../store/slices/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';
import { FaMapMarkerAlt, FaCity, FaGlobeAfrica, FaPhoneAlt } from 'react-icons/fa';

const ShippingScreen = () => {
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  // Pre-fill form if data exists
  const [address, setAddress] = useState(shippingAddress?.address || '');
  const [city, setCity] = useState(shippingAddress?.city || '');
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode || '');
  const [country, setCountry] = useState(shippingAddress?.country || 'Ethiopia');
  const [phoneNumber, setPhoneNumber] = useState(shippingAddress?.phoneNumber || '');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    // 1. Save to Redux State (and LocalStorage via helper)
    dispatch(saveShippingAddress({ address, city, postalCode, country, phoneNumber }));
    // 2. Move to Payment Step
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <CheckoutSteps step1 step2 />

        <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 relative overflow-hidden">
           {/* Decorative Background */}
           <div className="absolute top-0 right-0 w-40 h-40 bg-tibeb-pattern opacity-5 rounded-bl-[5rem]"></div>

           <h1 className="text-3xl font-black text-gray-900 mb-2">Shipping Details</h1>
           <p className="text-gray-500 mb-8">Where should we send your order?</p>

           <form onSubmit={submitHandler} className="space-y-6 relative z-10">

              <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Phone Number (For Post Office)</label>
                 <div className="relative">
                    <FaPhoneAlt className="absolute left-4 top-4 text-gray-300" />
                    <input 
                      type="text"
                      placeholder="e.g. 0911234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-medium focus:border-green-500 outline-none transition-colors"
                    />
                 </div>
              </div>

              {/* Address */}
              <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Street Address / Kebele</label>
                 <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-300" />
                    <input 
                      type="text"
                      placeholder="e.g. Bole Subcity, Kebele 04"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-medium focus:border-green-500 outline-none transition-colors"
                    />
                 </div>
              </div>

              {/* City & Postal Code */}
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">City</label>
                    <div className="relative">
                       <FaCity className="absolute left-4 top-4 text-gray-300" />
                       <input 
                         type="text"
                         placeholder="Addis Ababa"
                         value={city}
                         onChange={(e) => setCity(e.target.value)}
                         required
                         className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-medium focus:border-green-500 outline-none transition-colors"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Postal Code</label>
                    <input 
                      type="text"
                      placeholder="1000"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-green-500 outline-none transition-colors"
                    />
                 </div>
              </div>

              {/* Country */}
              <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Country</label>
                 <div className="relative">
                    <FaGlobeAfrica className="absolute left-4 top-4 text-gray-300" />
                    <input 
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-medium focus:border-green-500 outline-none transition-colors"
                    />
                 </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-200 transition-all active:scale-95 mt-4"
              >
                Continue to Payment
              </button>
           </form>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ShippingScreen;