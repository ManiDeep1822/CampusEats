const express = require('express');
const router = express.Router();
const { 
  getVendors, 
  getVendorById, 
  searchItems, 
  calculateOrderBill, 
  placeOrder, 
  getMyOrders, 
  getOrderById, 
  createVendorReview, 
  toggleFavorite, 
  getFavorites, 
  cancelOrder, 
  rateOrder, 
  subscribeToPush,
  getSavedAddresses,
  addSavedAddress,
  deleteSavedAddress
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(protect, authorizeRoles('student', 'admin'));
router.get('/vendors', getVendors);
router.get('/vendors/:id', getVendorById);
router.get('/search', searchItems);
router.post('/calculate-bill', calculateOrderBill);
router.post('/order', placeOrder);
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/cancel', cancelOrder);
router.post('/orders/:id/rate', rateOrder);
router.post('/vendors/:id/reviews', createVendorReview);
router.get('/favorites', getFavorites);
router.put('/favorites/:id', toggleFavorite);
router.post('/push/subscribe', subscribeToPush);

// Address Management
router.get('/addresses', getSavedAddresses);
router.post('/address', addSavedAddress);
router.delete('/address/:id', deleteSavedAddress);

module.exports = router;
