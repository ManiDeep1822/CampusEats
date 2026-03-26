const asyncHandler = require('express-async-handler');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const webpush = require('../utils/webpush');
const { generateReceiptHTML } = require('../utils/receiptTemplate');

const getMyDeliveryId = async (userId) => {
  const boy = await DeliveryBoy.findOne({ userId });
  if (!boy) throw new Error('Delivery profile not found');
  return boy._id;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).populate('activeOrderId');
  
  res.json({
    profile: deliveryBoy,
    stats: {
      totalDeliveries: deliveryBoy.totalDeliveries,
      rating: deliveryBoy.rating,
      earnings: deliveryBoy.earnings
    }
  });
});

const toggleAvailability = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  deliveryBoy.isAvailable = !deliveryBoy.isAvailable;
  await deliveryBoy.save();
  res.json({ isAvailable: deliveryBoy.isAvailable });
});

const getAvailableOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }, deliveryBoyId: null })
    .populate('vendorId', 'shopName location')
    .populate('studentId', 'name phone')
    .sort({ updatedAt: -1 });
  res.json(orders);
});

const acceptOrder = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);
  
  if (order && ['placed', 'confirmed', 'preparing', 'ready'].includes(order.status) && !order.deliveryBoyId) {
    order.deliveryBoyId = deliveryBoyId;
    await order.save();
    
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = order._id;
    deliveryBoy.isAvailable = false;
    await deliveryBoy.save();

    res.json(order);
  } else { res.status(400); throw new Error('Order not available for acceptance'); }
});

const pickUpOrder = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    if (order.status !== 'ready' && order.status !== 'preparing') {
      res.status(400);
      throw new Error(`Cannot pick up order. Current status is ${order.status}`);
    }

    order.status = 'picked_up';
    await order.save();
    
    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const msg = '🛵 Zoom zoom! Your rider just picked up your food and is on the way!';
      io.to(studentRoom).emit('order:picked', { orderId: order._id, message: msg });

      const notification = await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'order_update',
        orderId: order._id
      });
      io.to(studentRoom).emit('notification', notification);
    }
    
    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found or not assigned to you'); 
  }
});

const deliverOrder = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id)
    .populate('studentId', 'name email pushSubscription')
    .populate('vendorId', 'shopName')
    .populate('items.menuItemId', 'name price');
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    if (order.status !== 'picked_up') {
      res.status(400);
      throw new Error(`Cannot deliver order. Current status is ${order.status}`);
    }

    if (!order.deliveryOtp || order.deliveryOtp !== otp) {
      res.status(400); 
      throw new Error('Invalid Verification Code. Please get the correct 6-digit PIN from the student.');
    }

    order.status = 'delivered';
    order.deliveredAt = Date.now();
    order.deliveryOtp = undefined; 
    await order.save();
    
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = null;
    deliveryBoy.isAvailable = true;
    deliveryBoy.totalDeliveries += 1;
    deliveryBoy.earnings += (order.deliveryFee || 15);
    await deliveryBoy.save();

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;
      const studentMsg = '✅ Delivered! Enjoy your CampusEats meal!';
      const vendorMsg = `✅ Order #${order.orderId} was successfully delivered by the rider.`;
      
      io.to(studentRoom).emit('order:delivered', { orderId: order._id, message: studentMsg });
      io.to(vendorRoom).emit('order:delivered', { orderId: order._id, message: vendorMsg });

      const studentNotif = await Notification.create({ recipient: order.studentId, message: studentMsg, type: 'order_update', orderId: order._id });
      const vendorNotif = await Notification.create({ recipient: order.vendorId, message: vendorMsg, type: 'order_update', orderId: order._id });

      io.to(studentRoom).emit('notification', studentNotif);
      io.to(vendorRoom).emit('notification', vendorNotif);
    }

    // --- NEW: Multi-Channel Delivery Status (Push + Email) ---
    const htmlReceipt = generateReceiptHTML(order);

    // 1. Send Email Receipt
    if (order.studentId?.email) {
      console.log(`📧 Dispatching receipt email to: ${order.studentId.email}`);
      sendEmail({
        email: order.studentId.email,
        subject: `Order Delivered: #${order.orderId}`,
        html: htmlReceipt,
        message: `Your CampusEats order #${order.orderId} has been delivered! Total: ₹${(order.totalAmount || 0).toFixed(2)}`
      }).catch(err => console.error('❌ Async Email Failure:', err.message));
    }

    // 2. Send Web Push Notification
    if (order.studentId?.pushSubscription) {
      console.log(`🫸 Sending Web Push to student: ${order.studentId._id}`);
      const pushPayload = JSON.stringify({
        title: 'Order Delivered! 🎉',
        body: `Enjoy your meal from ${order.vendorId?.shopName || 'CampusEats'}!`,
        icon: '/logo192.png',
        data: {
            url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/orders`,
            orderId: order._id
        }
      });

      webpush.sendNotification(order.studentId.pushSubscription, pushPayload)
        .then(() => console.log('✅ Web Push delivered successfully'))
        .catch(err => {
            console.error('❌ Web Push FAILED:', err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
                User.findByIdAndUpdate(order.studentId._id, { $unset: { pushSubscription: 1 } }).exec();
            }
        });
    }

    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found or not assigned to you'); 
  }
});

const getOrderById = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id)
    .populate('vendorId', 'shopName location')
    .populate('studentId', 'name phone _id');
    
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    res.json(order);
  } else { 
    res.status(404); throw new Error('Order not found or not assigned to you'); 
  }
});

const sendDeliveryOTP = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id).populate('studentId', 'name email');
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    if (order.status !== 'picked_up') {
      res.status(400); throw new Error(`Order must be picked up before sending delivery OTP.`);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOtp = otpCode;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const msg = `🚚 Your rider is waiting! Secure PIN: ${otpCode}`;
      io.to(studentRoom).emit('delivery:otp', { 
        orderId: order._id, 
        message: msg 
      });

      const notification = await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'system',
        orderId: order._id
      });
      io.to(studentRoom).emit('notification', notification);
    }

    res.status(200).json({ message: 'Delivery PIN pushed to Student App Notifications' });
  } else { 
    res.status(404); throw new Error('Order not found or not assigned to you'); 
  }
});

module.exports = { getDashboardStats, toggleAvailability, getAvailableOrders, acceptOrder, pickUpOrder, deliverOrder, getOrderById, sendDeliveryOTP };
