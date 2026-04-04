const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { refundPayment } = require('../controllers/payment.controller');

/**
 * Background job to strictly cancel and refund orders that vendors have not 
 * accepted within 5 minutes of placement.
 * @param {Object} io - Socket.io instance
 */
const startAutoCancelJob = (io) => {
  console.log('--- 🛡️ Vendor Acceptance Timeout Job Initialized (5 mins) ---');
  
  // Run every 60 seconds
  setInterval(async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Find Orders in 'placed' status (paid, not yet confirmed) older than 5 mins
      const staleOrders = await Order.find({
        status: 'placed',
        createdAt: { $lt: fiveMinutesAgo }
      });

      if (staleOrders.length > 0) {
        console.log(`[TIMEOUT CRON] Processing ${staleOrders.length} unaccepted orders...`);
        
        for (const order of staleOrders) {
          const reason = "Vendor acceptance timeout (5 mins exceeded)";
          
          // 1. Update Order Status to Cancelled
          const cancelledOrder = await Order.findOneAndUpdate(
            { _id: order._id, status: 'placed' },
            { 
              $set: { 
                status: 'cancelled',
                cancellationReason: reason
              } 
            },
            { new: true }
          );

          if (cancelledOrder) {
            // 2. Initiate Automatic Refund
            const isRefunded = await refundPayment(order._id, reason);
            const refundStatus = isRefunded ? "initiated" : "requires manual support";
            
            console.log(`[TIMEOUT CRON] Cancelled Order ${order.orderId}. Refund: ${refundStatus}`);

            // 3. Notify Student
            if (io) {
              const studentRoom = `student:${order.studentId}`;
              const studentMsg = `⚠️ Order #${order.orderId} was automatically cancelled since the vendor didn't accept within 5 minutes. Refund ${refundStatus}.`;
              
              io.to(studentRoom).emit('order:cancelled', { 
                orderId: order._id, 
                message: studentMsg,
                refundStatus
              });

              // Persist Student Notification
              await Notification.create({
                recipient: order.studentId,
                message: studentMsg,
                type: 'order_update',
                orderId: order._id
              });

              // 4. Notify Vendor (to clear stale order from dashboard)
              const vendorRoom = `vendor:${order.vendorId}`;
              const vendorMsg = `❌ Order #${order.orderId} has been cancelled due to 5-minute acceptance timeout.`;
              io.to(vendorRoom).emit('order:cancelled', { orderId: order._id, message: vendorMsg });
            }
          }
        }
      }
    } catch (error) {
      console.error('[TIMEOUT CRON ERROR] Auto-cancel job failed:', error.message);
    }
  }, 60 * 1000); // 60s interval
};

module.exports = { startAutoCancelJob };
