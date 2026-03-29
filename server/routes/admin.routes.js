const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { admin } = require('../middleware/admin.middleware');
const {
  getUsers,
  deleteUser,
  updateUserRole,
  getVendors,
  updateVendorStatus,
  getDeliveryBoys,
  updateDeliveryStatus,
  getDashboardStats,
  createUser,
  deleteVendor,
  deleteDeliveryBoy
} = require('../controllers/admin.controller');

// Apply middleware to all routes
router.use(protect, admin);

// Dashboard stats
router.route('/stats').get(getDashboardStats);

// User routes
router.route('/users').get(getUsers).post(createUser);
router.route('/users/:id').delete(deleteUser);
router.route('/users/:id/role').put(updateUserRole);

// Vendor routes
router.route('/vendors').get(getVendors);
router.route('/vendors/:id').delete(deleteVendor);
router.route('/vendors/:id/status').put(updateVendorStatus);

// Delivery routes
router.route('/delivery').get(getDeliveryBoys);
router.route('/delivery/:id').delete(deleteDeliveryBoy);
router.route('/delivery/:id/status').put(updateDeliveryStatus);

module.exports = router;
