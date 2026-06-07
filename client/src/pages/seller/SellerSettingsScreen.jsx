import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCog, FaCloudUploadAlt, FaSave } from 'react-icons/fa';
import Loader from '../../components/Loader';
import {
  useGetSellerSettingsQuery,
  useUpdateSellerSettingsMutation,
  useUpdateSellerProfileMutation,
} from '../../store/slices/sellersApiSlice';
import { useUploadProductImagesMutation } from '../../store/slices/sellerProductsApiSlice';
import { setSellerCredentials } from '../../store/slices/sellerAuthSlice';
import { buildMediaUrl } from '../../utils/mediaUrl';

const defaultForm = {
  basicShopInfo: {
    shopName: '',
    shopSlug: '',
    shopLogo: '',
    shopBanner: '',
    shopDescription: '',
    businessCategory: 'Other',
    yearEstablished: '',
    businessType: 'Individual',
  },
  businessInfo: {
    legalBusinessName: '',
    businessRegistrationNumber: '',
    taxIdVatNumber: '',
    country: 'Ethiopia',
    businessAddress: '',
    contactEmail: '',
    contactPhone: '',
    identityVerificationDocuments: [],
    bankAccountDetails: {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
    },
    mobileMoneyNumber: '',
  },
  shippingSettings: {
    defaultShippingCountry: 'Ethiopia',
    processingTimeDays: 3,
    shippingMethods: {
      standardShipping: true,
      expressShipping: false,
      freeShipping: false,
    },
    shippingCostRules: {
      mode: 'per_product',
      flatAmount: 0,
    },
    supportedCountries: [],
    handlingFee: 0,
    returnAddress: '',
    warehouseLocations: [],
  },
  paymentPayoutSettings: {
    minimumPayoutThreshold: 0,
    autoPayoutEnabled: false,
    taxDeductionEnabled: false,
    payoutMethods: {
      bankTransfer: true,
      mobileMoney: false,
      paypal: false,
      stripe: false,
    },
    paypalEmail: '',
    stripeAccountId: '',
  },
  notificationSettings: {
    emailNewOrder: true,
    emailOrderCancelled: true,
    emailNewMessage: true,
    smsNotifications: false,
    pushNotifications: false,
  },
  shopAppearance: {
    theme: 'Classic',
    colorScheme: 'Emerald',
    fontStyle: 'Sans',
    homepageLayout: {
      featuredProducts: true,
      topSelling: true,
      newArrivals: true,
    },
    customBanners: [],
  },
  socialLinks: {
    facebook: '',
    instagram: '',
    telegram: '',
    websiteUrl: '',
    whatsappNumber: '',
  },
  securitySettings: {
    twoFactorEnabled: false,
  },
  performanceSettings: {
    vacationMode: false,
    autoReplyMessage: '',
    orderAutoConfirmationHours: 24,
    stockAutoHideWhenZero: true,
    lowStockAlerts: true,
  },
  adminControlled: {
    sellerRating: 0,
    totalOrders: 0,
    sellerLevel: 'Bronze',
    violationPoints: 0,
    commissionPercentage: 10,
  },
};

const textToArray = (value) =>
  String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const arrayToText = (value) => (Array.isArray(value) ? value.join(', ') : '');

const FieldBlock = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-bold text-gray-400 mb-2">{label}</label>
    {children}
  </div>
);

const SellerSettingsScreen = () => {
  const dispatch = useDispatch();
  const { sellerInfo } = useSelector((state) => state.sellerAuth);

  const { data, isLoading, error, refetch } = useGetSellerSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSellerSettingsMutation();
  const [uploadImages, { isLoading: uploading }] = useUploadProductImagesMutation();
  const [updateProfile, { isLoading: updatingProfile }] = useUpdateSellerProfileMutation();

  const [form, setForm] = useState(defaultForm);
  const [supportedCountriesInput, setSupportedCountriesInput] = useState('');
  const [warehouseInput, setWarehouseInput] = useState('');
  const [customBannersInput, setCustomBannersInput] = useState('');

  // Local state for personal profile & password change
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const settingsData = data?.settings || data;

  useEffect(() => {
    if (sellerInfo) {
      setName(sellerInfo.name || '');
      setEmail(sellerInfo.email || '');
      setPhoneNumber(sellerInfo.phoneNumber || '');
    }
  }, [sellerInfo]);

  useEffect(() => {
    if (!settingsData) return;
    setForm((prev) => ({
      ...prev,
      ...settingsData,
      basicShopInfo: { ...prev.basicShopInfo, ...(settingsData.basicShopInfo || {}) },
      businessInfo: {
        ...prev.businessInfo,
        ...(settingsData.businessInfo || {}),
        bankAccountDetails: {
          ...prev.businessInfo.bankAccountDetails,
          ...(settingsData.businessInfo?.bankAccountDetails || {}),
        },
      },
      shippingSettings: {
        ...prev.shippingSettings,
        ...(settingsData.shippingSettings || {}),
        shippingMethods: {
          ...prev.shippingSettings.shippingMethods,
          ...(settingsData.shippingSettings?.shippingMethods || {}),
        },
        shippingCostRules: {
          ...prev.shippingSettings.shippingCostRules,
          ...(settingsData.shippingSettings?.shippingCostRules || {}),
        },
      },
      paymentPayoutSettings: {
        ...prev.paymentPayoutSettings,
        ...(settingsData.paymentPayoutSettings || {}),
        payoutMethods: {
          ...prev.paymentPayoutSettings.payoutMethods,
          ...(settingsData.paymentPayoutSettings?.payoutMethods || {}),
        },
      },
      notificationSettings: { ...prev.notificationSettings, ...(settingsData.notificationSettings || {}) },
      shopAppearance: {
        ...prev.shopAppearance,
        ...(settingsData.shopAppearance || {}),
        homepageLayout: {
          ...prev.shopAppearance.homepageLayout,
          ...(settingsData.shopAppearance?.homepageLayout || {}),
        },
      },
      socialLinks: { ...prev.socialLinks, ...(settingsData.socialLinks || {}) },
      securitySettings: { ...prev.securitySettings, ...(settingsData.securitySettings || {}) },
      performanceSettings: { ...prev.performanceSettings, ...(settingsData.performanceSettings || {}) },
      adminControlled: { ...prev.adminControlled, ...(settingsData.adminControlled || {}) },
    }));

    setSupportedCountriesInput(arrayToText(settingsData.shippingSettings?.supportedCountries));
    setWarehouseInput(arrayToText(settingsData.shippingSettings?.warehouseLocations));
    setCustomBannersInput(arrayToText(settingsData.shopAppearance?.customBanners));
  }, [settingsData]);

  const setField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const setNestedField = (section, parent, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...prev[section][parent],
          [key]: value,
        },
      },
    }));
  };

  const uploadSingleImage = async (file, onDone) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    try {
      const uploaded = await uploadImages(fd).unwrap();
      const imagePath = uploaded?.[0];
      if (imagePath) onDone(imagePath);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Image upload failed');
    }
  };

  const uploadIdentityDocs = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((file) => fd.append('images', file));
    try {
      const uploaded = await uploadImages(fd).unwrap();
      setField('businessInfo', 'identityVerificationDocuments', [
        ...(form.businessInfo.identityVerificationDocuments || []),
        ...uploaded,
      ]);
      toast.success('Documents uploaded');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Document upload failed');
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    // 1. If password or profile fields are modified, update profile first
    const profileChanged = 
      name !== (sellerInfo?.name || '') ||
      email !== (sellerInfo?.email || '') ||
      phoneNumber !== (sellerInfo?.phoneNumber || '') ||
      password !== '';

    if (profileChanged) {
      if (password && password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      try {
        const profilePayload = { name, email, phoneNumber };
        if (password) {
          profilePayload.password = password;
        }
        const updatedProfileRes = await updateProfile(profilePayload).unwrap();
        dispatch(setSellerCredentials({
          ...sellerInfo,
          name: updatedProfileRes.name,
          email: updatedProfileRes.email,
          phoneNumber: updatedProfileRes.phoneNumber,
        }));
        setPassword('');
        setConfirmPassword('');
        toast.success('Seller profile updated successfully');
      } catch (err) {
        toast.error(err?.data?.message || err.error || 'Failed to update profile');
        return; // Don't proceed to save settings if profile update failed
      }
    }

    // 2. Save settings
    const payload = {
      ...form,
      shippingSettings: {
        ...form.shippingSettings,
        supportedCountries: textToArray(supportedCountriesInput),
        warehouseLocations: textToArray(warehouseInput),
      },
      shopAppearance: {
        ...form.shopAppearance,
        customBanners: textToArray(customBannersInput),
      },
    };

    try {
      const res = await updateSettings(payload).unwrap();
      setForm((prev) => ({ ...prev, ...(res.settings || {}) }));
      if (res.warnings?.length) {
        toast.info(res.warnings.join(' | '));
      } else {
        toast.success('Settings updated');
      }
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 font-bold p-8">{error?.data?.message || error.error}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">
      <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 mb-8">
        <FaCog className="text-green-400" /> Shop Settings
      </h1>

      <form onSubmit={submitHandler} className="space-y-8">
        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">Seller Profile & Password Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FieldBlock label="Full Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Email Address">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Phone Number">
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="New Password (leave blank to keep current)">
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Confirm New Password">
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">1. Basic Shop Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Shop Name">
              <input value={form.basicShopInfo.shopName} onChange={(e) => setField('basicShopInfo', 'shopName', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Shop URL Slug">
              <input value={form.basicShopInfo.shopSlug} onChange={(e) => setField('basicShopInfo', 'shopSlug', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Business Category">
              <select value={form.basicShopInfo.businessCategory} onChange={(e) => setField('basicShopInfo', 'businessCategory', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white">
                <option>Electronics</option>
                <option>Fashion</option>
                <option>Home & Kitchen</option>
                <option>Beauty</option>
                <option>Books</option>
                <option>Other</option>
              </select>
            </FieldBlock>
            <FieldBlock label="Business Type">
              <select value={form.basicShopInfo.businessType} onChange={(e) => setField('basicShopInfo', 'businessType', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white">
                <option>Individual</option>
                <option>Company</option>
                <option>Manufacturer</option>
                <option>Distributor</option>
              </select>
            </FieldBlock>
            <FieldBlock label="Year Established">
              <input type="number" value={form.basicShopInfo.yearEstablished || ''} onChange={(e) => setField('basicShopInfo', 'yearEstablished', Number(e.target.value) || '')} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <FieldBlock label="Shop Description" className="mt-4">
            <textarea value={form.basicShopInfo.shopDescription} onChange={(e) => setField('basicShopInfo', 'shopDescription', e.target.value)} rows="4" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
          </FieldBlock>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <p className="text-sm font-bold text-gray-400 mb-2">Shop Logo</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-gray-700 rounded-lg cursor-pointer text-gray-200">
                <FaCloudUploadAlt /> Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSingleImage(e.target.files?.[0], (path) => setField('basicShopInfo', 'shopLogo', path))} />
              </label>
              {form.basicShopInfo.shopLogo && <img src={buildMediaUrl(form.basicShopInfo.shopLogo)} alt="Logo" className="mt-3 w-20 h-20 object-cover rounded-lg border border-gray-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 mb-2">Shop Banner</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-gray-700 rounded-lg cursor-pointer text-gray-200">
                <FaCloudUploadAlt /> Upload Banner
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSingleImage(e.target.files?.[0], (path) => setField('basicShopInfo', 'shopBanner', path))} />
              </label>
              {form.basicShopInfo.shopBanner && <img src={buildMediaUrl(form.basicShopInfo.shopBanner)} alt="Banner" className="mt-3 w-full h-24 object-cover rounded-lg border border-gray-600" />}
            </div>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">2. Seller Profile / Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Legal Business Name">
              <input value={form.businessInfo.legalBusinessName} onChange={(e) => setField('businessInfo', 'legalBusinessName', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Business Registration Number">
              <input value={form.businessInfo.businessRegistrationNumber} onChange={(e) => setField('businessInfo', 'businessRegistrationNumber', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Tax ID / VAT Number">
              <input value={form.businessInfo.taxIdVatNumber} onChange={(e) => setField('businessInfo', 'taxIdVatNumber', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Country">
              <input value={form.businessInfo.country} onChange={(e) => setField('businessInfo', 'country', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Contact Email">
              <input value={form.businessInfo.contactEmail} onChange={(e) => setField('businessInfo', 'contactEmail', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Contact Phone">
              <input value={form.businessInfo.contactPhone} onChange={(e) => setField('businessInfo', 'contactPhone', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Mobile Money Number">
              <input value={form.businessInfo.mobileMoneyNumber} onChange={(e) => setField('businessInfo', 'mobileMoneyNumber', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Bank Name">
              <input value={form.businessInfo.bankAccountDetails.bankName} onChange={(e) => setNestedField('businessInfo', 'bankAccountDetails', 'bankName', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Bank Account Number">
              <input value={form.businessInfo.bankAccountDetails.accountNumber} onChange={(e) => setNestedField('businessInfo', 'bankAccountDetails', 'accountNumber', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Account Holder Name">
              <input value={form.businessInfo.bankAccountDetails.accountHolderName} onChange={(e) => setNestedField('businessInfo', 'bankAccountDetails', 'accountHolderName', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <FieldBlock label="Business Address" className="mt-4">
            <textarea value={form.businessInfo.businessAddress} onChange={(e) => setField('businessInfo', 'businessAddress', e.target.value)} rows="3" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
          </FieldBlock>

          <div className="mt-4">
            <p className="text-sm font-bold text-gray-400 mb-2">Identity Verification Documents</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-gray-700 rounded-lg cursor-pointer text-gray-200">
              <FaCloudUploadAlt /> Upload Documents
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => uploadIdentityDocs(e.target.files)} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {(form.businessInfo.identityVerificationDocuments || []).map((doc, idx) => (
                <a key={`${doc}-${idx}`} href={buildMediaUrl(doc)} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-blue-300">
                  Document {idx + 1}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">3. Shipping Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Default Shipping Country">
              <input value={form.shippingSettings.defaultShippingCountry} onChange={(e) => setField('shippingSettings', 'defaultShippingCountry', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Processing Time (days)">
              <input type="number" value={form.shippingSettings.processingTimeDays} onChange={(e) => setField('shippingSettings', 'processingTimeDays', Number(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Supported Countries (comma separated)" className="md:col-span-2">
              <input value={supportedCountriesInput} onChange={(e) => setSupportedCountriesInput(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Handling Fee">
              <input type="number" value={form.shippingSettings.handlingFee} onChange={(e) => setField('shippingSettings', 'handlingFee', Number(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Shipping Cost Rule">
              <select value={form.shippingSettings.shippingCostRules.mode} onChange={(e) => setNestedField('shippingSettings', 'shippingCostRules', 'mode', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white">
                <option value="per_product">Per Product</option>
                <option value="per_weight">Per Weight</option>
                <option value="per_region">Per Region</option>
              </select>
            </FieldBlock>
            <FieldBlock label="Flat Shipping Cost">
              <input type="number" value={form.shippingSettings.shippingCostRules.flatAmount} onChange={(e) => setNestedField('shippingSettings', 'shippingCostRules', 'flatAmount', Number(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Warehouse Locations (comma separated)">
              <input value={warehouseInput} onChange={(e) => setWarehouseInput(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <FieldBlock label="Return Address" className="mt-4">
            <textarea value={form.shippingSettings.returnAddress} onChange={(e) => setField('shippingSettings', 'returnAddress', e.target.value)} rows="3" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
          </FieldBlock>
          <div className="mt-4 flex flex-wrap gap-4 text-gray-300">
            <label><input type="checkbox" checked={form.shippingSettings.shippingMethods.standardShipping} onChange={(e) => setNestedField('shippingSettings', 'shippingMethods', 'standardShipping', e.target.checked)} className="mr-2" />Standard Shipping</label>
            <label><input type="checkbox" checked={form.shippingSettings.shippingMethods.expressShipping} onChange={(e) => setNestedField('shippingSettings', 'shippingMethods', 'expressShipping', e.target.checked)} className="mr-2" />Express Shipping</label>
            <label><input type="checkbox" checked={form.shippingSettings.shippingMethods.freeShipping} onChange={(e) => setNestedField('shippingSettings', 'shippingMethods', 'freeShipping', e.target.checked)} className="mr-2" />Free Shipping</label>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">4. Payment & Payout Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Minimum Payout Threshold">
              <input type="number" value={form.paymentPayoutSettings.minimumPayoutThreshold} onChange={(e) => setField('paymentPayoutSettings', 'minimumPayoutThreshold', Number(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="PayPal Email">
              <input value={form.paymentPayoutSettings.paypalEmail} onChange={(e) => setField('paymentPayoutSettings', 'paypalEmail', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Stripe Account ID">
              <input value={form.paymentPayoutSettings.stripeAccountId} onChange={(e) => setField('paymentPayoutSettings', 'stripeAccountId', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Commission Rate (Read-only)">
              <input value={String(form.adminControlled.commissionPercentage)} readOnly className="w-full bg-[#0b1220] border border-gray-700 rounded-xl px-4 py-3 text-gray-400" />
            </FieldBlock>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-gray-300">
            <label><input type="checkbox" checked={form.paymentPayoutSettings.autoPayoutEnabled} onChange={(e) => setField('paymentPayoutSettings', 'autoPayoutEnabled', e.target.checked)} className="mr-2" />Auto Payout</label>
            <label><input type="checkbox" checked={form.paymentPayoutSettings.taxDeductionEnabled} onChange={(e) => setField('paymentPayoutSettings', 'taxDeductionEnabled', e.target.checked)} className="mr-2" />Tax Deduction</label>
            <label><input type="checkbox" checked={form.paymentPayoutSettings.payoutMethods.bankTransfer} onChange={(e) => setNestedField('paymentPayoutSettings', 'payoutMethods', 'bankTransfer', e.target.checked)} className="mr-2" />Bank Transfer</label>
            <label><input type="checkbox" checked={form.paymentPayoutSettings.payoutMethods.mobileMoney} onChange={(e) => setNestedField('paymentPayoutSettings', 'payoutMethods', 'mobileMoney', e.target.checked)} className="mr-2" />Mobile Money</label>
            <label><input type="checkbox" checked={form.paymentPayoutSettings.payoutMethods.paypal} onChange={(e) => setNestedField('paymentPayoutSettings', 'payoutMethods', 'paypal', e.target.checked)} className="mr-2" />PayPal</label>
            <label><input type="checkbox" checked={form.paymentPayoutSettings.payoutMethods.stripe} onChange={(e) => setNestedField('paymentPayoutSettings', 'payoutMethods', 'stripe', e.target.checked)} className="mr-2" />Stripe</label>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">5. Notifications</h2>
          <div className="flex flex-wrap gap-4 text-gray-300">
            <label><input type="checkbox" checked={form.notificationSettings.emailNewOrder} onChange={(e) => setField('notificationSettings', 'emailNewOrder', e.target.checked)} className="mr-2" />Email: New Order</label>
            <label><input type="checkbox" checked={form.notificationSettings.emailOrderCancelled} onChange={(e) => setField('notificationSettings', 'emailOrderCancelled', e.target.checked)} className="mr-2" />Email: Order Cancelled</label>
            <label><input type="checkbox" checked={form.notificationSettings.emailNewMessage} onChange={(e) => setField('notificationSettings', 'emailNewMessage', e.target.checked)} className="mr-2" />Email: New Message</label>
            <label><input type="checkbox" checked={form.notificationSettings.smsNotifications} onChange={(e) => setField('notificationSettings', 'smsNotifications', e.target.checked)} className="mr-2" />SMS</label>
            <label><input type="checkbox" checked={form.notificationSettings.pushNotifications} onChange={(e) => setField('notificationSettings', 'pushNotifications', e.target.checked)} className="mr-2" />Push</label>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">6 & 7. Appearance and Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FieldBlock label="Theme">
              <input value={form.shopAppearance.theme} onChange={(e) => setField('shopAppearance', 'theme', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Color Scheme">
              <input value={form.shopAppearance.colorScheme} onChange={(e) => setField('shopAppearance', 'colorScheme', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Font Style">
              <input value={form.shopAppearance.fontStyle} onChange={(e) => setField('shopAppearance', 'fontStyle', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Custom Banners URLs (comma separated)" className="md:col-span-3">
              <input value={customBannersInput} onChange={(e) => setCustomBannersInput(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <div className="mb-5 flex flex-wrap gap-4 text-gray-300">
            <label><input type="checkbox" checked={form.shopAppearance.homepageLayout.featuredProducts} onChange={(e) => setNestedField('shopAppearance', 'homepageLayout', 'featuredProducts', e.target.checked)} className="mr-2" />Featured Products</label>
            <label><input type="checkbox" checked={form.shopAppearance.homepageLayout.topSelling} onChange={(e) => setNestedField('shopAppearance', 'homepageLayout', 'topSelling', e.target.checked)} className="mr-2" />Top Selling</label>
            <label><input type="checkbox" checked={form.shopAppearance.homepageLayout.newArrivals} onChange={(e) => setNestedField('shopAppearance', 'homepageLayout', 'newArrivals', e.target.checked)} className="mr-2" />New Arrivals</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Facebook URL">
              <input value={form.socialLinks.facebook} onChange={(e) => setField('socialLinks', 'facebook', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Instagram URL">
              <input value={form.socialLinks.instagram} onChange={(e) => setField('socialLinks', 'instagram', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Telegram URL">
              <input value={form.socialLinks.telegram} onChange={(e) => setField('socialLinks', 'telegram', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Website URL">
              <input value={form.socialLinks.websiteUrl} onChange={(e) => setField('socialLinks', 'websiteUrl', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="WhatsApp Number">
              <input value={form.socialLinks.whatsappNumber} onChange={(e) => setField('socialLinks', 'whatsappNumber', e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">8 & 9. Security and Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBlock label="Order Auto Confirmation (hours)">
              <input type="number" value={form.performanceSettings.orderAutoConfirmationHours} onChange={(e) => setField('performanceSettings', 'orderAutoConfirmationHours', Number(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
            <FieldBlock label="Vacation Auto-reply Message">
              <textarea value={form.performanceSettings.autoReplyMessage} onChange={(e) => setField('performanceSettings', 'autoReplyMessage', e.target.value)} rows="3" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white" />
            </FieldBlock>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-gray-300">
            <label><input type="checkbox" checked={form.securitySettings.twoFactorEnabled} onChange={(e) => setField('securitySettings', 'twoFactorEnabled', e.target.checked)} className="mr-2" />Enable 2FA</label>
            <label><input type="checkbox" checked={form.performanceSettings.vacationMode} onChange={(e) => setField('performanceSettings', 'vacationMode', e.target.checked)} className="mr-2" />Vacation Mode</label>
            <label><input type="checkbox" checked={form.performanceSettings.stockAutoHideWhenZero} onChange={(e) => setField('performanceSettings', 'stockAutoHideWhenZero', e.target.checked)} className="mr-2" />Auto-hide Out-of-stock</label>
            <label><input type="checkbox" checked={form.performanceSettings.lowStockAlerts} onChange={(e) => setField('performanceSettings', 'lowStockAlerts', e.target.checked)} className="mr-2" />Low Stock Alerts</label>
          </div>
        </section>

        <section className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-5">Admin Controlled (Read-only)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-[#0f172a] p-3 rounded-xl"><p className="text-gray-400">Seller Rating</p><p className="text-white font-bold">{Number(form.adminControlled.sellerRating || 0).toFixed(1)}</p></div>
            <div className="bg-[#0f172a] p-3 rounded-xl"><p className="text-gray-400">Total Orders</p><p className="text-white font-bold">{form.adminControlled.totalOrders || 0}</p></div>
            <div className="bg-[#0f172a] p-3 rounded-xl"><p className="text-gray-400">Seller Level</p><p className="text-white font-bold">{form.adminControlled.sellerLevel || 'Bronze'}</p></div>
            <div className="bg-[#0f172a] p-3 rounded-xl"><p className="text-gray-400">Violation Points</p><p className="text-white font-bold">{form.adminControlled.violationPoints || 0}</p></div>
            <div className="bg-[#0f172a] p-3 rounded-xl"><p className="text-gray-400">Commission</p><p className="text-white font-bold">{form.adminControlled.commissionPercentage || 10}%</p></div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full bg-green-500 hover:bg-green-400 text-[#0f172a] font-black py-4 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          <FaSave /> {saving || uploading ? 'Saving...' : 'Save Shop Settings'}
        </button>
      </form>
    </div>
  );
};

export default SellerSettingsScreen;
