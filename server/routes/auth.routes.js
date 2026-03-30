const express = require('express');
const router = express.Router();
const { 
  registerUser, loginUser, getMe, refreshToken, logoutUser, 
  changePassword, googleAuth, forgotPassword, resetPasswordWithOTP,
  sendOTP, verifyAccount, updateProfile,
  addAddress, removeAddress, setDefaultAddress
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/send-otp', sendOTP);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/verify-account', verifyAccount);
router.post('/refresh-token', refreshToken);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOTP);

router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

// Profile Management (Private)
router.put('/profile', protect, updateProfile);
router.post('/profile/address', protect, addAddress);
router.delete('/profile/address/:id', protect, removeAddress);
router.put('/profile/address/:id/default', protect, setDefaultAddress);

module.exports = router;
