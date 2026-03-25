const express = require('express');
const router = express.Router();
const { handleBotQuery } = require('../controllers/bot.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.post('/query', protect, authorizeRoles('student', 'admin'), handleBotQuery);

module.exports = router;
