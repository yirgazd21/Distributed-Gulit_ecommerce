const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sellerSchema = new mongoose.Schema(
  {
    // 1. Personal / Login Information
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    
    // 👇 NEW: The actual text string of their National ID
    nationalIdNumber: { type: String, required: true, unique: true },

    // 2. Business / Shop Details
    shopName: { type: String, required: true, unique: true },
    shopDescription: { type: String, required: true },
    shopCategory: { 
      type: String, 
      required: true,
      enum: ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Beauty', 'Other'],
      default: 'Other'
    },
    // 👇 NEW: Business Legal Information
    businessLegalName: { type: String, required: true },
    taxIdVatNumber: { type: String, required: true, unique: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String },
      country: { type: String, required: true, default: 'Ethiopia' },
    },

    // 3. KYC Verifications (These permanently store the file paths on your server)
    kycDocuments: {
      idCardImage: { type: String, required: true },           // Front/Back of National ID
      merchantLicenseImage: { type: String, required: true },  // Renewed Trade License
      taxReceiptImage: { type: String, required: true },       // TIN Certificate / Tax Clearance
    },

    // 4. Financial / Local Wallet System
    walletBalance: { type: Number, required: true, default: 0.00 }, 
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountHolderName: { type: String },
    },

    // 5. Admin Control Flags
    isApproved: { type: Boolean, required: true, default: false }, 
    isActive: { type: Boolean, required: true, default: true }, 
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Match password for login
sellerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hash password before saving
sellerSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;
