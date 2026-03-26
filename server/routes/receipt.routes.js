const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth.middleware');
const { generateReceiptHTML } = require('../utils/receiptTemplate');
const asyncHandler = require('express-async-handler');

// @desc    Get order receipt HTML
// @route   GET /api/orders/:id/receipt
// @access  Private (Student who owns the order or Admin)
router.get('/:id/receipt', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('studentId', 'name email')
    .populate('vendorId', 'shopName')
    .populate('items.menuItemId', 'name price');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization: Only the student who placed it or an admin can see it
  const isOwner = order.studentId && order.studentId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this receipt');
  }

  const html = generateReceiptHTML(order);
  
  // Inject some basic styling to make it fill the screen nicely in a tab
  const fullPageHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CampusEats Receipt - #${order.orderId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { background-color: #f1f5f9; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; font-family: sans-serif; }
          .receipt-container { width: 100%; max-width: 600px; margin: 0 auto; }
          .no-print { margin-bottom: 20px; text-align: right; }
          
          @media print {
            body { background-color: white; padding: 0; }
            .no-print { display: none; }
            .receipt-container { max-width: 100%; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div id="receipt-content">
            ${html}
          </div>
        </div>
      </body>
    </html>
  `;

  res.send(fullPageHtml);
}));

module.exports = router;
