import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSellerRegisterMutation } from '../../store/slices/sellersApiSlice';
import { useSellerGoogleIdentityMutation } from '../../store/slices/sellersApiSlice';
import { FaStore, FaUserTie, FaFileAlt, FaUpload, FaSpinner, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';

const SellerRegisterScreen = () => {
  const navigate = useNavigate();

  // 1. Personal Info State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleLinked, setGoogleLinked] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nationalIdNumber, setNationalIdNumber] = useState('');

  // 2. Business Info State
  const [businessLegalName, setBusinessLegalName] = useState('');
  const [taxIdVatNumber, setTaxIdVatNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('Electronics');
  const [shopDescription, setShopDescription] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Ethiopia');

  // 3. KYC File State
  const [idCardImage, setIdCardImage] = useState(null);
  const [merchantLicenseImage, setMerchantLicenseImage] = useState(null);
  const [taxReceiptImage, setTaxReceiptImage] = useState(null);

  const [registerSeller, { isLoading }] = useSellerRegisterMutation();
  const [sellerGoogleIdentity, { isLoading: loadingGoogleIdentity }] = useSellerGoogleIdentityMutation();
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await sellerGoogleIdentity({ credential: response.credential }).unwrap();
            setName((prev) => prev || res.name);
            setEmail((prev) => prev || res.email);
            setGoogleCredential(response.credential);
            setGoogleLinked(true);
            if (!password && !confirmPassword) {
              const autoPass = `Gulit_${Math.random().toString(36).slice(2, 10)}!`;
              setPassword(autoPass);
              setConfirmPassword(autoPass);
            }
            toast.success('Google account linked. Continue with business and KYC details.');
          } catch (err) {
            toast.error(err?.data?.message || err.error);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'signup_with',
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
  }, [confirmPassword, googleClientId, password, sellerGoogleIdentity]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!googleLinked && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!idCardImage || !merchantLicenseImage || !taxReceiptImage) {
      toast.error('Please upload all required KYC documents.');
      return;
    }

    // Because we have files, we MUST use FormData, not standard JSON
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('phoneNumber', phoneNumber);
    formData.append('nationalIdNumber', nationalIdNumber);
    formData.append('businessLegalName', businessLegalName);
    formData.append('taxIdVatNumber', taxIdVatNumber);
    formData.append('shopName', shopName);
    formData.append('shopCategory', shopCategory);
    formData.append('shopDescription', shopDescription);
    formData.append('street', street);
    formData.append('city', city);
    formData.append('postalCode', postalCode);
    formData.append('country', country);
    if (googleCredential) {
      formData.append('googleCredential', googleCredential);
    }
    
    // Append Files (The names must match the multer fields in the backend!)
    formData.append('idCardImage', idCardImage);
    formData.append('merchantLicenseImage', merchantLicenseImage);
    formData.append('taxReceiptImage', taxReceiptImage);

    try {
      const res = await registerSeller(formData).unwrap();
      toast.success(res.message); // Displays the "pending approval" message
      navigate('/seller/login');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-lg shadow-green-500/30">
            G
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Create your Seller Account</h2>
          <p className="text-gray-400 mt-2">Join Gulit and start selling to millions nationwide.</p>
        </div>

        <form onSubmit={submitHandler} className="space-y-8">
          <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-3">Quick Start with Google</h3>
            {googleClientId ? (
              <div className="flex justify-center md:justify-start">
                <div ref={googleBtnRef} className={loadingGoogleIdentity ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            ) : (
              <button type="button" className="w-full md:w-auto bg-white text-gray-500 border border-gray-300 px-4 py-3 rounded-xl font-bold inline-flex items-center gap-2">
                <FaGoogle className="text-red-500" /> Set VITE_GOOGLE_CLIENT_ID to enable Google registration
              </button>
            )}
            {googleLinked && (
              <p className="text-green-400 text-sm font-bold mt-3">Google account linked for this registration.</p>
            )}
          </div>
          
          {/* =======================================
              SECTION 1: Personal Information
              ======================================= */}
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
              <FaUserTie className="text-green-500" /> Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="Abebe Kebede" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="abebe@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Phone Number</label>
                <input type="text" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="+251 911 000 000" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">National ID Number</label>
                <input type="text" required value={nationalIdNumber} onChange={(e) => setNationalIdNumber(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="FTE-12345678" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 pr-12 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 pr-12 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-400"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =======================================
              SECTION 2: Business Information
              ======================================= */}
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
              <FaStore className="text-green-500" /> Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Business Legal Name</label>
                <input type="text" required value={businessLegalName} onChange={(e) => setBusinessLegalName(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="e.g., Abebe Kebede Trading PLC" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Tax ID / VAT Number</label>
                <input type="text" required value={taxIdVatNumber} onChange={(e) => setTaxIdVatNumber(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="e.g., 45-1234567-8" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Shop Name</label>
                <input type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="Abebe Electronics" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Primary Category</label>
                <select value={shopCategory} onChange={(e) => setShopCategory(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors">
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Books">Books</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-400 mb-2">Shop Description</label>
                <textarea required rows="3" value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none" placeholder="Tell buyers what you sell..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Street Address</label>
                <input type="text" required value={street} onChange={(e) => setStreet(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="Bole Road, Dembel City Center" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">City</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="Addis Ababa" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Postal Code (Optional)</label>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="1000" />
              </div>
            </div>
          </div>

          {/* =======================================
              SECTION 3: KYC Document Uploads
              ======================================= */}
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <FaFileAlt className="text-green-500" /> KYC Verification
            </h3>
            <p className="text-sm text-gray-400 mb-6 border-b border-gray-700 pb-4">
              Please upload clear images or PDF files. Maximum size: 5MB per file.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* ID Upload */}
              <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center group hover:border-green-500 transition-colors relative overflow-hidden">
                <FaUpload className="text-3xl text-gray-500 group-hover:text-green-500 mb-3 transition-colors" />
                <span className="text-sm font-bold text-gray-300">National ID</span>
                <span className="text-xs text-gray-500 mt-1 mb-4">Front & Back</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  required
                  onChange={(e) => setIdCardImage(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {idCardImage && <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded w-full truncate">{idCardImage.name}</div>}
              </div>

              {/* License Upload */}
              <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center group hover:border-green-500 transition-colors relative overflow-hidden">
                <FaUpload className="text-3xl text-gray-500 group-hover:text-green-500 mb-3 transition-colors" />
                <span className="text-sm font-bold text-gray-300">Merchant License</span>
                <span className="text-xs text-gray-500 mt-1 mb-4">Renewed Trade License</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  required
                  onChange={(e) => setMerchantLicenseImage(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {merchantLicenseImage && <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded w-full truncate">{merchantLicenseImage.name}</div>}
              </div>

              {/* Tax Upload */}
              <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center group hover:border-green-500 transition-colors relative overflow-hidden">
                <FaUpload className="text-3xl text-gray-500 group-hover:text-green-500 mb-3 transition-colors" />
                <span className="text-sm font-bold text-gray-300">Tax Receipt</span>
                <span className="text-xs text-gray-500 mt-1 mb-4">TIN Certificate</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  required
                  onChange={(e) => setTaxReceiptImage(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {taxReceiptImage && <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded w-full truncate">{taxReceiptImage.name}</div>}
              </div>

            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-400 text-[#0f172a] font-black text-xl py-5 rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_-5px_rgba(34,197,94,0.6)] disabled:bg-gray-600 disabled:shadow-none flex items-center justify-center gap-3"
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : 'Submit Registration Application'}
          </button>

          <p className="text-center text-gray-400 mt-6 font-medium">
            Already have a seller account? <Link to="/seller/login" className="text-green-500 hover:underline">Log in here</Link>
          </p>

        </form>
      </div>
    </div>
  );
};

export default SellerRegisterScreen;
