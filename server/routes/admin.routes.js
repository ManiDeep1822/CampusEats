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
  getWeeklyPayouts,
  settlePayout,
  deleteVendorReview,
  createUser,
  resendStaffOTP,
  deleteVendor,
  deleteDeliveryBoy,
  getCoupons,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getGlobalOrders
} = require('../controllers/admin.controller');

// Apply middleware to all routes
router.use(protect, admin);

// Dashboard stats
router.route('/stats').get(getDashboardStats);
router.route('/payouts').get(getWeeklyPayouts);
router.route('/payouts/settle').post(settlePayout);

// User routes
router.route('/users')
  .get(getUsers)
  .post(createUser);
router.route('/users/resend-otp').post(resendStaffOTP);
router.route('/users/:id').delete(deleteUser);
router.route('/users/:id/role').put(updateUserRole);

// Vendor routes
router.route('/vendors').get(getVendors);
router.route('/vendors/:id').delete(deleteVendor);
router.route('/vendors/:id/status').put(updateVendorStatus);
router.route('/vendors/:vendorId/reviews/:reviewId').delete(deleteVendorReview);

// Delivery routes
router.route('/delivery').get(getDeliveryBoys);
router.route('/delivery/:id').delete(deleteDeliveryBoy);
router.route('/delivery/:id/status').put(updateDeliveryStatus);

// Coupon routes
router.route('/coupons').get(getCoupons).post(createCoupon);
router.route('/coupons/:id').delete(deleteCoupon);
router.route('/coupons/:id/status').put(toggleCouponStatus);

// Global Order Management
router.route('/orders').get(getGlobalOrders);

module.exports = router;
