const Seller = require('../models/sellerModel');
const SellerSettings = require('../models/sellerSettingsModel');
const Order = require('../models/orderModel');

const DEFAULT_COMMISSION_PERCENTAGE = 10;

const getSellerLevel = (totalOrders) => {
  if (totalOrders >= 500) return 'Gold';
  if (totalOrders >= 100) return 'Silver';
  return 'Bronze';
};

const computeAdminMetrics = async (sellerId) => {
  const totalOrders = await Order.countDocuments({ 'orderItems.seller': sellerId });
  return {
    sellerRating: 0,
    totalOrders,
    sellerLevel: getSellerLevel(totalOrders),
    violationPoints: 0,
    commissionPercentage: DEFAULT_COMMISSION_PERCENTAGE,
  };
};

const normalizeSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildDefaultSettings = (seller, adminMetrics) => ({
  seller: seller._id,
  basicShopInfo: {
    shopName: seller.shopName || '',
    shopSlug: normalizeSlug(seller.shopName || ''),
    shopLogo: '',
    shopBanner: '',
    shopDescription: seller.shopDescription || '',
    businessCategory: seller.shopCategory || 'Other',
    yearEstablished: null,
    businessType: 'Individual',
  },
  businessInfo: {
    legalBusinessName: '',
    businessRegistrationNumber: '',
    taxIdVatNumber: '',
    country: seller.address?.country || 'Ethiopia',
    businessAddress: [
      seller.address?.street,
      seller.address?.city,
      seller.address?.postalCode,
      seller.address?.country,
    ]
      .filter(Boolean)
      .join(', '),
    contactEmail: seller.email || '',
    contactPhone: seller.phoneNumber || '',
    identityVerificationDocuments: [],
    bankAccountDetails: {
      bankName: seller.bankDetails?.bankName || '',
      accountNumber: seller.bankDetails?.accountNumber || '',
      accountHolderName: seller.bankDetails?.accountHolderName || '',
    },
    mobileMoneyNumber: '',
  },
  shippingSettings: {
    defaultShippingCountry: seller.address?.country || 'Ethiopia',
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
    supportedCountries: [seller.address?.country || 'Ethiopia'],
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
  storePolicies: {
    returnPolicy: '',
    refundPolicy: '',
    warrantyPolicy: '',
    cancellationPolicy: '',
    privacyPolicy: '',
    shippingPolicy: '',
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
  adminControlled: adminMetrics,
});

const updateApprovalLockedField = ({ approved, currentValue, newValue, warnings, label }) => {
  const normalizedCurrent = currentValue ?? '';
  const normalizedNew = newValue ?? '';
  if (!approved) return normalizedNew;

  if (normalizedCurrent && String(normalizedCurrent).trim() !== String(normalizedNew).trim()) {
    warnings.push(`${label} cannot be changed after approval`);
    return normalizedCurrent;
  }
  return normalizedCurrent || normalizedNew;
};

// @desc    Get seller settings
// @route   GET /api/sellers/settings
// @access  Private/Seller
const getSellerSettings = async (req, res) => {
  const seller = await Seller.findById(req.seller._id);
  if (!seller) {
    return res.status(404).json({ message: 'Seller not found' });
  }

  const adminMetrics = await computeAdminMetrics(req.seller._id);
  let settings = await SellerSettings.findOne({ seller: req.seller._id });

  if (!settings) {
    settings = await SellerSettings.create(buildDefaultSettings(seller, adminMetrics));
  } else {
    settings.adminControlled = adminMetrics;
    await settings.save();
  }

  res.json(settings);
};

// @desc    Update seller settings
// @route   PUT /api/sellers/settings
// @access  Private/Seller
const updateSellerSettings = async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const adminMetrics = await computeAdminMetrics(req.seller._id);
    let settings = await SellerSettings.findOne({ seller: req.seller._id });
    if (!settings) {
      settings = await SellerSettings.create(buildDefaultSettings(seller, adminMetrics));
    }

    const payload = req.body || {};
    const warnings = [];

    if (payload.basicShopInfo) {
      const basic = payload.basicShopInfo;

      if (basic.shopSlug !== undefined) {
        const normalizedSlug = normalizeSlug(basic.shopSlug);
        if (normalizedSlug) {
          const existingSlug = await SellerSettings.findOne({
            _id: { $ne: settings._id },
            'basicShopInfo.shopSlug': normalizedSlug,
          });
          if (existingSlug) {
            return res.status(400).json({ message: 'Shop URL is already taken' });
          }
          settings.basicShopInfo.shopSlug = normalizedSlug;
        } else {
          settings.basicShopInfo.shopSlug = '';
        }
      }

      if (basic.shopName !== undefined) settings.basicShopInfo.shopName = basic.shopName;
      if (basic.shopLogo !== undefined) settings.basicShopInfo.shopLogo = basic.shopLogo;
      if (basic.shopBanner !== undefined) settings.basicShopInfo.shopBanner = basic.shopBanner;
      if (basic.shopDescription !== undefined) settings.basicShopInfo.shopDescription = basic.shopDescription;
      if (basic.businessCategory !== undefined) settings.basicShopInfo.businessCategory = basic.businessCategory;
      if (basic.yearEstablished !== undefined) settings.basicShopInfo.yearEstablished = basic.yearEstablished || null;
      if (basic.businessType !== undefined) settings.basicShopInfo.businessType = basic.businessType;

      // Keep core seller profile consistent where it already exists.
      if (basic.shopName !== undefined && basic.shopName !== seller.shopName) {
        const duplicateShop = await Seller.findOne({ _id: { $ne: seller._id }, shopName: basic.shopName });
        if (duplicateShop) {
          return res.status(400).json({ message: 'Shop name already exists' });
        }
        seller.shopName = basic.shopName;
      }
      if (basic.shopDescription !== undefined) seller.shopDescription = basic.shopDescription;
      if (basic.businessCategory !== undefined) seller.shopCategory = basic.businessCategory;
    }

    if (payload.businessInfo) {
      const business = payload.businessInfo;
      const approved = Boolean(seller.isApproved);

      if (business.legalBusinessName !== undefined) {
        settings.businessInfo.legalBusinessName = updateApprovalLockedField({
          approved,
          currentValue: settings.businessInfo.legalBusinessName,
          newValue: business.legalBusinessName,
          warnings,
          label: 'Legal business name',
        });
      }
      if (business.businessRegistrationNumber !== undefined) {
        settings.businessInfo.businessRegistrationNumber = updateApprovalLockedField({
          approved,
          currentValue: settings.businessInfo.businessRegistrationNumber,
          newValue: business.businessRegistrationNumber,
          warnings,
          label: 'Business registration number',
        });
      }
      if (business.taxIdVatNumber !== undefined) {
        settings.businessInfo.taxIdVatNumber = updateApprovalLockedField({
          approved,
          currentValue: settings.businessInfo.taxIdVatNumber,
          newValue: business.taxIdVatNumber,
          warnings,
          label: 'Tax ID / VAT',
        });
      }

      if (business.country !== undefined) settings.businessInfo.country = business.country;
      if (business.businessAddress !== undefined) settings.businessInfo.businessAddress = business.businessAddress;
      if (business.contactEmail !== undefined) settings.businessInfo.contactEmail = business.contactEmail;
      if (business.contactPhone !== undefined) settings.businessInfo.contactPhone = business.contactPhone;
      if (business.identityVerificationDocuments !== undefined) {
        settings.businessInfo.identityVerificationDocuments = Array.isArray(business.identityVerificationDocuments)
          ? business.identityVerificationDocuments
          : [];
      }
      if (business.mobileMoneyNumber !== undefined) settings.businessInfo.mobileMoneyNumber = business.mobileMoneyNumber;

      if (business.bankAccountDetails) {
        if (business.bankAccountDetails.bankName !== undefined) {
          settings.businessInfo.bankAccountDetails.bankName = business.bankAccountDetails.bankName;
        }
        if (business.bankAccountDetails.accountNumber !== undefined) {
          settings.businessInfo.bankAccountDetails.accountNumber = business.bankAccountDetails.accountNumber;
        }
        if (business.bankAccountDetails.accountHolderName !== undefined) {
          settings.businessInfo.bankAccountDetails.accountHolderName = business.bankAccountDetails.accountHolderName;
        }
      }
    }

    if (payload.shippingSettings) {
      const shipping = payload.shippingSettings;
      if (shipping.defaultShippingCountry !== undefined) settings.shippingSettings.defaultShippingCountry = shipping.defaultShippingCountry;
      if (shipping.processingTimeDays !== undefined) settings.shippingSettings.processingTimeDays = Number(shipping.processingTimeDays) || 0;
      if (shipping.handlingFee !== undefined) settings.shippingSettings.handlingFee = Number(shipping.handlingFee) || 0;
      if (shipping.returnAddress !== undefined) settings.shippingSettings.returnAddress = shipping.returnAddress;
      if (shipping.supportedCountries !== undefined) settings.shippingSettings.supportedCountries = Array.isArray(shipping.supportedCountries) ? shipping.supportedCountries : [];
      if (shipping.warehouseLocations !== undefined) settings.shippingSettings.warehouseLocations = Array.isArray(shipping.warehouseLocations) ? shipping.warehouseLocations : [];

      if (shipping.shippingMethods) {
        if (shipping.shippingMethods.standardShipping !== undefined) settings.shippingSettings.shippingMethods.standardShipping = Boolean(shipping.shippingMethods.standardShipping);
        if (shipping.shippingMethods.expressShipping !== undefined) settings.shippingSettings.shippingMethods.expressShipping = Boolean(shipping.shippingMethods.expressShipping);
        if (shipping.shippingMethods.freeShipping !== undefined) settings.shippingSettings.shippingMethods.freeShipping = Boolean(shipping.shippingMethods.freeShipping);
      }

      if (shipping.shippingCostRules) {
        if (shipping.shippingCostRules.mode !== undefined) settings.shippingSettings.shippingCostRules.mode = shipping.shippingCostRules.mode;
        if (shipping.shippingCostRules.flatAmount !== undefined) settings.shippingSettings.shippingCostRules.flatAmount = Number(shipping.shippingCostRules.flatAmount) || 0;
      }
    }

    if (payload.paymentPayoutSettings) {
      const payout = payload.paymentPayoutSettings;
      if (payout.minimumPayoutThreshold !== undefined) settings.paymentPayoutSettings.minimumPayoutThreshold = Number(payout.minimumPayoutThreshold) || 0;
      if (payout.autoPayoutEnabled !== undefined) settings.paymentPayoutSettings.autoPayoutEnabled = Boolean(payout.autoPayoutEnabled);
      if (payout.taxDeductionEnabled !== undefined) settings.paymentPayoutSettings.taxDeductionEnabled = Boolean(payout.taxDeductionEnabled);
      if (payout.paypalEmail !== undefined) settings.paymentPayoutSettings.paypalEmail = payout.paypalEmail;
      if (payout.stripeAccountId !== undefined) settings.paymentPayoutSettings.stripeAccountId = payout.stripeAccountId;
      if (payout.payoutMethods) {
        if (payout.payoutMethods.bankTransfer !== undefined) settings.paymentPayoutSettings.payoutMethods.bankTransfer = Boolean(payout.payoutMethods.bankTransfer);
        if (payout.payoutMethods.mobileMoney !== undefined) settings.paymentPayoutSettings.payoutMethods.mobileMoney = Boolean(payout.payoutMethods.mobileMoney);
        if (payout.payoutMethods.paypal !== undefined) settings.paymentPayoutSettings.payoutMethods.paypal = Boolean(payout.payoutMethods.paypal);
        if (payout.payoutMethods.stripe !== undefined) settings.paymentPayoutSettings.payoutMethods.stripe = Boolean(payout.payoutMethods.stripe);
      }
    }

    if (payload.storePolicies) {
      const currentPolicies = settings.storePolicies && typeof settings.storePolicies.toObject === 'function' ? settings.storePolicies.toObject() : settings.storePolicies || {};
      settings.storePolicies = { ...currentPolicies, ...payload.storePolicies };
    }
    if (payload.notificationSettings) {
      const currentNotifications = settings.notificationSettings && typeof settings.notificationSettings.toObject === 'function' ? settings.notificationSettings.toObject() : settings.notificationSettings || {};
      settings.notificationSettings = { ...currentNotifications, ...payload.notificationSettings };
    }
    if (payload.socialLinks) {
      const currentSocial = settings.socialLinks && typeof settings.socialLinks.toObject === 'function' ? settings.socialLinks.toObject() : settings.socialLinks || {};
      settings.socialLinks = { ...currentSocial, ...payload.socialLinks };
    }

    if (payload.shopAppearance) {
      const appearance = payload.shopAppearance;
      if (appearance.theme !== undefined) settings.shopAppearance.theme = appearance.theme;
      if (appearance.colorScheme !== undefined) settings.shopAppearance.colorScheme = appearance.colorScheme;
      if (appearance.fontStyle !== undefined) settings.shopAppearance.fontStyle = appearance.fontStyle;
      if (appearance.customBanners !== undefined) settings.shopAppearance.customBanners = Array.isArray(appearance.customBanners) ? appearance.customBanners : [];
      if (appearance.homepageLayout) {
        if (appearance.homepageLayout.featuredProducts !== undefined) settings.shopAppearance.homepageLayout.featuredProducts = Boolean(appearance.homepageLayout.featuredProducts);
        if (appearance.homepageLayout.topSelling !== undefined) settings.shopAppearance.homepageLayout.topSelling = Boolean(appearance.homepageLayout.topSelling);
        if (appearance.homepageLayout.newArrivals !== undefined) settings.shopAppearance.homepageLayout.newArrivals = Boolean(appearance.homepageLayout.newArrivals);
      }
    }

    if (payload.securitySettings) {
      if (payload.securitySettings.twoFactorEnabled !== undefined) {
        settings.securitySettings.twoFactorEnabled = Boolean(payload.securitySettings.twoFactorEnabled);
      }
    }

    if (payload.performanceSettings) {
      const perf = payload.performanceSettings;
      if (perf.vacationMode !== undefined) settings.performanceSettings.vacationMode = Boolean(perf.vacationMode);
      if (perf.autoReplyMessage !== undefined) settings.performanceSettings.autoReplyMessage = perf.autoReplyMessage;
      if (perf.orderAutoConfirmationHours !== undefined) settings.performanceSettings.orderAutoConfirmationHours = Number(perf.orderAutoConfirmationHours) || 0;
      if (perf.stockAutoHideWhenZero !== undefined) settings.performanceSettings.stockAutoHideWhenZero = Boolean(perf.stockAutoHideWhenZero);
      if (perf.lowStockAlerts !== undefined) settings.performanceSettings.lowStockAlerts = Boolean(perf.lowStockAlerts);
    }

    settings.adminControlled = adminMetrics;

    await seller.save();
    await settings.save();

    return res.json({
      settings,
      warnings,
    });
  } catch (error) {
    console.error('Error updating seller settings:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getSellerSettings,
  updateSellerSettings,
};
