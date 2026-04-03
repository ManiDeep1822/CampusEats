const express = require('express');
const router = express.Router();
const { 
  createGroupCart, 
  joinGroupCart, 
  getGroupCart, 
  addItemToGroup, 
  removeItemFromGroup, 
  checkoutGroupCart 
} = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(protect, authorizeRoles('student', 'admin'));

router.post('/create', createGroupCart);
router.post('/join', joinGroupCart);
router.get('/:joinCode', getGroupCart);
router.post('/add-item', addItemToGroup);
router.post('/remove-item', removeItemFromGroup);
router.post('/checkout', checkoutGroupCart);

module.exports = router;
