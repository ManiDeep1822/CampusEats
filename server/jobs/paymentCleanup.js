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
      // FIX: Increased from 2 minutes to 5 minutes to accommodate
      // slow bank connections and payment gateways.
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Find payments that are still pending and older than 5 minutes
      const stalePayments = await Payment.find({
        status: 'pending',
        createdAt: { $lt: fiveMinutesAgo }
      });

      if (stalePayments.length > 0) {
        console.log(`[CRON] Cleaning up ${stalePayments.length} stale payments...`);
        
        for (const payment of stalePayments) {
          // 1. Mark Payment as Cancelled
          payment.status = 'cancelled';
          await payment.save();

          // 2. Atomically update the associated Order to Cancelled
          // Use findOneAndUpdate with a status guard to prevent a race condition where
          // verifyPayment() concurrently moves it to 'placed' — we must NOT overwrite that.
          const order = await Order.findOneAndUpdate(
            { _id: payment.orderId, status: 'pending_payment' }, // Only cancel if still waiting for payment
            { $set: { status: 'cancelled' } },
            { new: true }
          );

          if (order) {
            // 3. Notify Student via Socket.io
            if (io) {
              const studentRoom = `student:${order.studentId}`;
              const msg = `⚠️ Order #${order.orderId} was cancelled due to payment timeout (5 mins exceeded).`;
              
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
          } else {
            console.log(`[CRON] Skipped Order for Payment ${payment._id} — was already updated (race condition prevented).`);
          }
        }
      }
    } catch (error) {
      console.error('[CRON ERROR] Payment cleanup job failed:', error.message);
    }
  }, 60 * 1000); // 60s interval
};

module.exports = { startPaymentCleanupJob };
