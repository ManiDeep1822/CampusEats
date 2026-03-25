const express = require('express');
const router = express.Router();
const { getDashboardStats, toggleShopStatus, getMenu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStatus, getOrders, updateOrderStatus } = require('../controllers/vendor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(protect, authorizeRoles('vendor', 'admin'));
router.get('/dashboard', getDashboardStats);
router.put('/toggle-status', toggleShopStatus);
router.route('/menu').get(getMenu).post(addMenuItem);
router.route('/menu/:id').put(updateMenuItem).delete(deleteMenuItem);
router.put('/menu/:id/toggle', toggleMenuItemStatus);
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
