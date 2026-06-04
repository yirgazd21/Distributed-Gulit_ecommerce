const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Seller = require('../models/sellerModel');

// 🛡️ 1. Protect Route (Verify Token)
const protect = async (req, res, next) => {
    let token;

    // Check if header has "Bearer eyJhbGci..."
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header (remove "Bearer " space)
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token ID & attach to request
            req.user = await User.findById(decoded.id).select('-password');

            // User not found in DB — token is valid but account doesn't exist
            // (can happen if DB was switched / user was deleted)
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next(); // Move to the next function
        } catch (error) {
            console.log(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        return; // prevent fall-through to the !token check below
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// 👑 2. Admin Only Middleware
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

// 🏪 3. Seller Only Middleware
// const seller = (req, res, next) => {
//     if (req.user && (req.user.role === 'seller')) {
//         next();
//     } else {
//         res.status(401).json({ message: 'Not authorized as a seller' });
//     }
// };



// @desc    Middleware to protect Seller routes
const protectSeller = async (req, res, next) => {
  let token;

  // 1. Look for the Bearer token in the Authorization header (from apiSlice)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Fallback to cookies (if you ever change your frontend auth method)
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the seller in the database
      req.seller = await Seller.findById(decoded.id || decoded.userId).select('-password');

      if (!req.seller) {
        return res.status(401).json({ message: 'Not authorized, seller not found' });
      }

      // 🛡️ Security Check: Ensure they are approved and active
      if (!req.seller.isActive) {
        return res.status(401).json({ message: 'Not authorized, account suspended' });
      }
      if (!req.seller.isApproved) {
        return res.status(401).json({ message: 'Not authorized, account pending approval' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect, admin, protectSeller };
