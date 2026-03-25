const express = require('express');
const router = express.Router();
const { submitFeedback, getFeedback } = require('../controllers/feedback.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

// Public route for anyone to send feedback or contact us
router.post('/', submitFeedback);

// Admin-only route to retrieve feedback
router.get('/', protect, authorizeRoles('admin'), getFeedback);

module.exports = router;
