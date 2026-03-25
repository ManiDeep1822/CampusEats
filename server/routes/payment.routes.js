const express = require('express');
const router = express.Router();
const { initiatePayment, verifyPayment, getPaymentHistory } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);

module.exports = router;
