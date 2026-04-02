const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  // Read token from Bearer header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Fallback: Read token from query parameter (for window.open)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET mismatch or missing');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Check for single-device login (session sync)
      // If the token version doesn't match the current DB version, it means a newer login occurred.
      if (typeof decoded.tokenVersion !== 'undefined' && decoded.tokenVersion !== req.user.tokenVersion) {
        // M10: Relax this check in development to prevent friction with multiple tabs/refreshes
        if (process.env.NODE_ENV === 'production') {
           res.status(401);
           throw new Error('Session expired: Logged in from another device');
        } else {
           console.warn(`[DEV ONLY] Token version mismatch for user ${req.user.email} (Token: ${decoded.tokenVersion}, DB: ${req.user.tokenVersion}). Proceeding anyway.`);
        }
      }

      return next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed', { cause: error });
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect };
