const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  
  const order = await Order.findById(orderId);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.studentId.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // Calculate precise paisa amount directly from secure MongoDB Order total
  const amountToPay = Math.round(order.totalAmount * 100);

  const options = {
    amount: amountToPay,
    currency: "INR",
    receipt: orderId.toString()
  };

  const razorpayOrder = await razorpay.orders.create(options);

  const payment = new Payment({
    orderId,
    studentId: req.user._id,
    amount: order.totalAmount,
    method: 'razorpay',
    status: 'pending',
    transactionId: razorpayOrder.id 
  });
  const created = await payment.save();

  res.status(201).json({
    payment: created,
    razorpayOrderId: razorpayOrder.id,
    amount: amountToPay,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  const payment = await Payment.findById(paymentId);
  if (!payment) { res.status(404); throw new Error('Payment not found'); }

  // --- FIX: Idempotency Guard ---
  // Prevents re-processing if the CRON job already cancelled this, or
  // if this webhook is called twice.
  if (payment.status === 'completed') {
    return res.json({ success: true, payment, message: 'Payment was already verified.' });
  }
  if (payment.status === 'cancelled') {
    res.status(400); throw new Error('Payment session has expired. Please place a new order.');
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
    payment.status = 'completed';
    payment.paidAt = Date.now();
    payment.transactionId = razorpay_payment_id; // real payment ID
    await payment.save();

    const order = await Order.findById(payment.orderId);

    if (order) {
      order.paymentId = payment._id;
      order.status = 'placed'; // Lock in the placed status
      await order.save();
      
      const populatedOrder = await Order.findById(order._id).populate({
        path: 'vendorId',
        select: 'userId'
      });

      const io = req.app.get('io');
      if (io && populatedOrder.vendorId?.userId) {
        const vendorRoom = `vendor:${populatedOrder.vendorId.userId}`;
        const vendorMsg = `🚀 New paid order! A confirmed order for ₹${order.totalAmount} is waiting for you.`;
        
        io.to(vendorRoom).emit('order:new', { orderId: order._id, message: vendorMsg });

        // Persist vendor notification to DB
        await Notification.create({
          recipient: populatedOrder.vendorId.userId,
          message: vendorMsg,
          type: 'order_update',
          orderId: order._id
        });
      }

      // If this was a group order, mark the GroupCart as converted and notify all members
      if (order.isGroupOrder) {
        try {
          const GroupCart = require('../models/GroupCart');
          // The joinCode was returned alongside the order on group checkout
          // Find the cart that was for this order's vendor and host
          const groupCart = await GroupCart.findOne({
            hostId: order.studentId,
            vendorId: order.vendorId,
            status: 'active'
          });
          if (groupCart) {
            groupCart.status = 'converted';
            await groupCart.save();
            if (io) {
              const populatedCart = await GroupCart.findById(groupCart._id)
                .populate('members.userId', 'name profilePic');
              io.to(`group:${groupCart.joinCode}`).emit('group:cart_updated', {
                ...populatedCart.toObject(),
                status: 'converted'
              });
            }
          }
        } catch (groupErr) {
          console.error('[Payment] Could not convert group cart:', groupErr.message);
        }
      }
    }
    
    res.json({ success: true, payment });
  } else {
    payment.status = 'failed';
    await payment.save();
    
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.status = 'cancelled';
      await order.save();
    }
    
    res.status(400); 
    throw new Error('Payment verification failed. Invalid cryptographic signature.');
  }
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.json(payments);
});

const refundPayment = async (orderId) => {
  try {
    const payment = await Payment.findOne({ orderId, status: 'completed' });
    if (!payment || !payment.transactionId) return false;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const refund = await razorpay.payments.refund(payment.transactionId, {
      amount: Math.round(payment.amount * 100),
      speed: "normal",
      notes: { reason: "Customer cancelled within 60s window" }
    });

    if (refund) {
      payment.status = 'refunded';
      await payment.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Refund failed:', error);
    return false;
  }
};

module.exports = { initiatePayment, verifyPayment, getPaymentHistory, refundPayment };
