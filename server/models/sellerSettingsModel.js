const mongoose = require('mongoose');

const sellerSettingsSchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Seller',
      unique: true,
      index: true,
    },
    basicShopInfo: {
      shopName: { type: String, default: '' },
      shopSlug: { type: String, default: '' },
      shopLogo: { type: String, default: '' },
      shopBanner: { type: String, default: '' },
      shopDescription: { type: String, default: '' },
      businessCategory: { type: String, default: 'Other' },
      yearEstablished: { type: Number, default: null },
      businessType: {
        type: String,
        enum: ['Individual', 'Company', 'Manufacturer', 'Distributor'],
        default: 'Individual',
      },
    },
    businessInfo: {
      legalBusinessName: { type: String, default: '' },
      businessRegistrationNumber: { type: String, default: '' },
      taxIdVatNumber: { type: String, default: '' },
      country: { type: String, default: 'Ethiopia' },
      businessAddress: { type: String, default: '' },
      contactEmail: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      identityVerificationDocuments: [{ type: String }],
      bankAccountDetails: {
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        accountHolderName: { type: String, default: '' },
      },
      mobileMoneyNumber: { type: String, default: '' },
    },
    shippingSettings: {
      defaultShippingCountry: { type: String, default: 'Ethiopia' },
      processingTimeDays: { type: Number, default: 3 },
      shippingMethods: {
        standardShipping: { type: Boolean, default: true },
        expressShipping: { type: Boolean, default: false },
        freeShipping: { type: Boolean, default: false },
      },
      shippingCostRules: {
        mode: {
          type: String,
          enum: ['per_product', 'per_weight', 'per_region'],
          default: 'per_product',
        },
        flatAmount: { type: Number, default: 0 },
      },
      supportedCountries: [{ type: String }],
      handlingFee: { type: Number, default: 0 },
      returnAddress: { type: String, default: '' },
      warehouseLocations: [{ type: String }],
    },
    paymentPayoutSettings: {
      minimumPayoutThreshold: { type: Number, default: 0 },
      autoPayoutEnabled: { type: Boolean, default: false },
      taxDeductionEnabled: { type: Boolean, default: false },
      payoutMethods: {
        bankTransfer: { type: Boolean, default: true },
        mobileMoney: { type: Boolean, default: false },
        paypal: { type: Boolean, default: false },
        stripe: { type: Boolean, default: false },
      },
      paypalEmail: { type: String, default: '' },
      stripeAccountId: { type: String, default: '' },
    },
    storePolicies: {
      returnPolicy: { type: String, default: '' },
      refundPolicy: { type: String, default: '' },
      warrantyPolicy: { type: String, default: '' },
      cancellationPolicy: { type: String, default: '' },
      privacyPolicy: { type: String, default: '' },
      shippingPolicy: { type: String, default: '' },
    },
    notificationSettings: {
      emailNewOrder: { type: Boolean, default: true },
      emailOrderCancelled: { type: Boolean, default: true },
      emailNewMessage: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
    },
    shopAppearance: {
      theme: { type: String, default: 'Classic' },
      colorScheme: { type: String, default: 'Emerald' },
      fontStyle: { type: String, default: 'Sans' },
      homepageLayout: {
        featuredProducts: { type: Boolean, default: true },
        topSelling: { type: Boolean, default: true },
        newArrivals: { type: Boolean, default: true },
      },
      customBanners: [{ type: String }],
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      telegram: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' },
    },
    securitySettings: {
      twoFactorEnabled: { type: Boolean, default: false },
    },
    performanceSettings: {
      vacationMode: { type: Boolean, default: false },
      autoReplyMessage: { type: String, default: '' },
      orderAutoConfirmationHours: { type: Number, default: 24 },
      stockAutoHideWhenZero: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
    },
    adminControlled: {
      sellerRating: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      sellerLevel: { type: String, default: 'Bronze' },
      violationPoints: { type: Number, default: 0 },
      commissionPercentage: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
);

sellerSettingsSchema.index(
  { 'basicShopInfo.shopSlug': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'basicShopInfo.shopSlug': { $exists: true, $type: 'string', $ne: '' },
    },
  }
);

const SellerSettings = mongoose.model('SellerSettings', sellerSettingsSchema);

module.exports = SellerSettings;
