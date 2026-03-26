const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, refreshToken, logoutUser, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
