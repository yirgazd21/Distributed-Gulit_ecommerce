const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyGoogleCredential, normalizeNameFromEmail } = require('../utils/googleAuth');
const { sendEmail } = require('../utils/emailService');

// 🔒 Helper function to generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token expires in 30 days
    });
};

const formatUserResponse = (user, includeToken = true) => {
    const response = {
        _id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'buyer',
        address: user.address || {},
    };

    if (includeToken) {
        response.token = generateToken(user._id);
    }

    return response;
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, shopName } = req.body;

        // 1. Check if all fields are present
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // 2. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const normalizedRole = role === 'admin' ? 'admin' : (role === 'seller' ? 'seller' : 'buyer');

        // 4. Create the user
        const user = await User.create({
            name,
            email,
            password,
            role: normalizedRole,
            sellerProfile: role === 'seller' ? { shopName } : {} 
        });

        if (user) {
            res.status(201).json(formatUserResponse(user));
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Authenticate a user (Login)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check for user email
        const user = await User.findOne({ email });

        // 2. Check password
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json(formatUserResponse(user));
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Authenticate/Register user with Google
// @route   POST /api/users/google
// @access  Public
const googleAuthUser = async (req, res) => {
    try {
        const { credential } = req.body;
        const { email, name, googleId } = await verifyGoogleCredential(credential);

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name: name || normalizeNameFromEmail(email),
                email,
                password: crypto.randomBytes(24).toString('hex'),
                role: 'buyer',
                googleId,
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            if (!user.name) user.name = name || normalizeNameFromEmail(email);
            await user.save();
        }

        return res.json(formatUserResponse(user));
    } catch (error) {
        return res.status(401).json({ message: error.message || 'Google authentication failed' });
    }
};


const logoutUser = (req, res) => {
    // If you were using cookies, you would clear them here:
    // res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
    
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Buyer forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user || user.role !== 'buyer') {
        return res.status(404).json({ message: 'Account does not exist' });
    }

    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(rawCode).digest('hex');

    user.resetPasswordToken = hashedCode;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const resetUrl = process.env.BUYER_RESET_URL || 'http://localhost:5173/forgot-password';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Password Reset Code</h2>
        <p>You requested a password reset for your Gulit account.</p>
        <p>Your 6-digit reset code is:</p>
        <p style="font-size:28px;font-weight:700;margin:16px 0;color:#16a34a">${rawCode}</p>
        <p>Enter this code on the Forgot Password page to continue.</p>
        <p>If you prefer, open this page:</p>
        <p><a href="${resetUrl}" style="color:#16a34a">${resetUrl}</a></p>
        <p>This code expires in 30 minutes.</p>
      </div>
    `;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Gulit Password Reset Code',
            html,
        });
    } catch (error) {
        user.resetPasswordToken = '';
        user.resetPasswordExpires = undefined;
        await user.save();
        console.error('Forgot password email send failed:', error.message || error);
        return res.status(500).json({ message: 'Unable to send reset email. Please try again later.' });
    }

    return res.json({
        message: 'Reset code sent to your email.',
    });
};

// @desc    Verify reset code
// @route   POST /api/users/verify-reset-code
// @access  Public
const verifyResetCode = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ message: 'Email and reset code are required' });
    }

    const hashedCode = crypto.createHash('sha256').update(String(code)).digest('hex');
    const user = await User.findOne({
        email,
        resetPasswordToken: hashedCode,
        resetPasswordExpires: { $gt: new Date() },
        role: 'buyer',
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    return res.json({ message: 'Reset code verified' });
};

// @desc    Buyer reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
        role: 'buyer',
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password reset successful' });
};



const updateUserProfile = async (req, res) => {
    // req.user is already there because of the 'protect' middleware
    const user = await User.findById(req.user._id);

    if (user) {
        // Update fields OR keep existing ones
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        if (req.body.address) {
            user.address = {
                phoneNumber: req.body.address.phoneNumber ?? user.address?.phoneNumber ?? '',
                address: req.body.address.address ?? user.address?.address ?? '',
                city: req.body.address.city ?? user.address?.city ?? '',
                postalCode: req.body.address.postalCode ?? user.address?.postalCode ?? '',
                country: req.body.address.country ?? user.address?.country ?? 'Ethiopia',
            };
        }

        // Only hash/update password if the user actually sent a new one
        if (req.body.password) {
            user.password = req.body.password; 
            // Note: Your User model's "pre-save" hook will automatically hash this!
        }

        const updatedUser = await user.save();

        // Send back the fresh data (so the frontend updates immediately)
        res.json(formatUserResponse(updatedUser, false));
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};



module.exports = {
    generateToken,
    registerUser,
    loginUser,
    googleAuthUser,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    logoutUser,
    updateUserProfile,
};
