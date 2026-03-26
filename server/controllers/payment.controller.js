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
      
      const io = req.app.get('io');
      if (io) {
        const vendorMsg = `🚀 New paid order! A confirmed order for ₹${order.totalAmount} is waiting for you.`;
        // --- FIX: This is the CORRECT place to notify vendor. Only after payment confirmed. ---
        io.to(`vendor:${order.vendorId}`).emit('order:new', { orderId: order._id, message: vendorMsg });

        // Persist vendor notification to DB
        await Notification.create({
          recipient: order.vendorId,
          message: vendorMsg,
          type: 'order_update',
          orderId: order._id
        });
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

module.exports = { initiatePayment, verifyPayment, getPaymentHistory };
