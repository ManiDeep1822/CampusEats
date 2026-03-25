const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

/**
 * Background job to cancel pending payments that are older than 2 minutes.
 * This prevents orders from being stuck in "pending_payment" indefinitely.
 * @param {Object} io - Socket.io instance
 */
const startPaymentCleanupJob = (io) => {
  console.log('--- 🛡️ Stale Payment Cleanup Job Initialized ---');
  
  // Run every 60 seconds
  setInterval(async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      // Find payments that are still pending and older than 2 minutes
      const stalePayments = await Payment.find({
        status: 'pending',
        createdAt: { $lt: twoMinutesAgo }
      });

      if (stalePayments.length > 0) {
        console.log(`[CRON] Cleaning up ${stalePayments.length} stale payments...`);
        
        for (const payment of stalePayments) {
          // 1. Mark Payment as Cancelled
          payment.status = 'cancelled';
          await payment.save();

          // 2. Mark associated Order as Cancelled
          const order = await Order.findById(payment.orderId);
          if (order && order.status === 'pending_payment') {
            order.status = 'cancelled';
            await order.save();

            // 3. Notify Student via Socket.io
            if (io) {
              const studentRoom = `student:${order.studentId}`;
              const msg = `⚠️ Order #${order.orderId} was cancelled due to payment timeout (2 mins exceeded).`;
              
              io.to(studentRoom).emit('order:cancelled', { 
                orderId: order._id, 
                message: msg 
              });

              // 4. Persist Notification in DB
              try {
                await Notification.create({
                  recipient: order.studentId,
                  message: msg,
                  type: 'order_update',
                  orderId: order._id
                });
              } catch (nErr) {
                console.error("Cleanup notification persist error:", nErr.message);
              }
            }
            console.log(`[CRON] Cancelled Order ${order.orderId} (Payment Timeout)`);
          }
        }
      }
    } catch (error) {
      console.error('[CRON ERROR] Payment cleanup job failed:', error.message);
    }
  }, 60 * 1000); // 60s interval
};

module.exports = { startPaymentCleanupJob };
