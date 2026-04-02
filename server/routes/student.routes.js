const express = require('express');
const router = express.Router();
const { 
  getVendors, 
  getVendorById, 
  searchItems, 
  calculateOrderBill, 
  applyCoupon,
  getAvailableCoupons,
  placeOrder, 
  getMyOrders, 
  getOrderById, 
  createVendorReview, 
  toggleFavorite, 
  getFavorites, 
  cancelOrder, 
  rateOrder, 
  getSavedAddresses,
  addSavedAddress,
  deleteSavedAddress,
  getOrderReceipt
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(protect, authorizeRoles('student', 'admin'));
router.get('/vendors', getVendors);
router.get('/vendors/:id', getVendorById);
router.get('/search', searchItems);
router.post('/calculate-bill', calculateOrderBill);
router.post('/apply-coupon', applyCoupon);
router.get('/coupons/available', getAvailableCoupons);
router.post('/order', placeOrder);
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrderById);
router.get('/orders/:id/receipt', getOrderReceipt);
router.put('/orders/:id/cancel', cancelOrder);
router.post('/orders/:id/rate', rateOrder);
router.post('/vendors/:id/reviews', createVendorReview);
router.get('/favorites', getFavorites);
router.put('/favorites/:id', toggleFavorite);

// Address Management
router.get('/addresses', getSavedAddresses);
router.post('/address', addSavedAddress);
router.delete('/address/:id', deleteSavedAddress);

module.exports = router;
