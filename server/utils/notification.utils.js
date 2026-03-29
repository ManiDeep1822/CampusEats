const webpush = require('web-push');
const User = require('../models/User');
const Order = require('../models/Order');
const sendEmail = require('./sendEmail');

// Initialize Web Push
if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Sends a Web Push notification to a specific user if enabled in their settings.
 */
const sendPushNotification = async (userId, title, body, orderId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscription || !user.notificationSettings?.push) {
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-icon.svg',
      data: { url: `/student/tracking/${orderId}` }
    });

    await webpush.sendNotification(user.pushSubscription, payload);
    console.log(`📱 Push notification sent to user: ${userId}`);
  } catch (error) {
    console.error('❌ Web Push Error:', error.message);
  }
};

/**
 * Sends an Order Receipt email to a specific user if enabled in their settings.
 */
const sendOrderReceiptEmail = async (userId, orderId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.notificationSettings?.email) {
       console.log(`📧 Email skipped for user ${userId} (Disabled in settings)`);
       return;
    }

    const order = await Order.findById(orderId)
      .populate('vendorId', 'shopName location')
      .populate('items.menuItemId', 'name');

    if (!order) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.menuItemId?.name || 'Item'} x ${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #ff5722; text-align: center;">Order Delivered! 🍕</h2>
        <p>Hi ${user.name},</p>
        <p>Your order from <strong>${order.vendorId?.shopName}</strong> has been delivered. We hope you enjoy your meal!</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Delivery Fee</td>
              <td style="padding: 10px; text-align: right;">₹${order.deliveryFee}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; font-size: 18px; color: #ff5722;">Total Amount</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 18px; color: #ff5722;">₹${order.totalAmount}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
          <p>Delivered to: ${order.deliveryAddress}</p>
          <p>Order ID: ${order.orderId}</p>
          <p>&copy; 2026 CampusEats. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: `Order Receipt - ${order.orderId} 🧾`,
      message: `Your order from ${order.vendorId?.shopName} has been delivered. Total: ₹${order.totalAmount}`,
      html
    });

  } catch (error) {
    console.error('❌ Email Receipt Error:', error.message);
  }
};

module.exports = {
  sendPushNotification,
  sendOrderReceiptEmail
};
