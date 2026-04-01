const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

/**
 * Background job to cancel pending payments that are older than 5 minutes.
 * This prevents orders from being stuck in "pending_payment" indefinitely.
 * @param {Object} io - Socket.io instance
 */
const startPaymentCleanupJob = (io) => {
  console.log('--- 🛡️ Stale Payment Cleanup Job Initialized ---');
  
  // Run every 60 seconds
  setInterval(async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Find Orders that are still pending payment and older than 5 minutes
      const staleOrders = await Order.find({
        status: 'pending_payment',
        createdAt: { $lt: fiveMinutesAgo }
      });

      if (staleOrders.length > 0) {
        console.log(`[CRON] Cleaning up ${staleOrders.length} unpaid orders...`);
        
        for (const order of staleOrders) {
          // 1. Atomically update the Order to Cancelled
          const cancelledOrder = await Order.findOneAndUpdate(
            { _id: order._id, status: 'pending_payment' },
            { $set: { status: 'cancelled' } },
            { new: true }
          );

          if (cancelledOrder) {
            // 2. Mark any associated pending Payments as Cancelled
            await Payment.updateMany(
              { orderId: order._id, status: 'pending' },
              { $set: { status: 'cancelled' } }
            );

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
                const notification = await Notification.create({
                  recipient: order.studentId,
                  message: msg,
                  type: 'order_update',
                  orderId: order._id
                });
                io.to(studentRoom).emit('notification', notification);
              } catch (nErr) {
                console.error("Cleanup notification persist error:", nErr.message);
              }
            }
            console.log(`[CRON] Cancelled Order ${order.orderId} (Payment Timeout)`);
          } else {
            console.log(`[CRON] Skipped Order ${order._id} — was already updated.`);
          }
        }
      }
    } catch (error) {
      console.error('[CRON ERROR] Payment cleanup job failed:', error.message);
    }
  }, 60 * 1000); // 60s interval
};

module.exports = { startPaymentCleanupJob };
