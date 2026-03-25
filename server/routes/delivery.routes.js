const express = require('express');
const router = express.Router();
const { getDashboardStats, toggleAvailability, getAvailableOrders, acceptOrder, pickUpOrder, deliverOrder, getOrderById, sendDeliveryOTP } = require('../controllers/delivery.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(protect, authorizeRoles('delivery', 'admin'));
router.get('/dashboard', getDashboardStats);
router.put('/toggle-availability', toggleAvailability);
router.get('/available-orders', getAvailableOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/picked', pickUpOrder);
router.put('/orders/:id/delivered', deliverOrder);
router.post('/orders/:id/send-otp', sendDeliveryOTP);

module.exports = router;
