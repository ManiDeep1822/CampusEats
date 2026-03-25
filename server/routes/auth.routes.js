const express = require('express');
const router = express.Router();
const { sendOTP, verifyAndRegister, loginUser, getMe, refreshToken, logoutUser } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/send-otp', sendOTP);
router.post('/verify-register', verifyAndRegister);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);

module.exports = router;
