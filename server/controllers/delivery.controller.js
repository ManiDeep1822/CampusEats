const asyncHandler = require('express-async-handler');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/notification.utils');

const getMyDeliveryId = async (userId) => {
  const boy = await DeliveryBoy.findOne({ userId });
  if (!boy) throw new Error('Delivery profile not found');
  return boy._id;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).populate('activeOrderId');
  
  // Fetch overall orders for this delivery boy to calculate weekly stats
  const orders = await Order.find({ deliveryBoyId, status: 'delivered' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter(o => o.deliveredAt >= today);
  const todaysEarnings = todaysOrders.reduce((acc, order) => acc + (order.deliveryFee || 15), 0);
  
  // Weekly Data Map Logic (Last 7 Days)
  const weeklyDataMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyDataMap[dayName] = { name: dayName, earnings: 0, dateStr: d.toDateString() };
  }

  orders.forEach(order => {
    const orderDate = new Date(order.deliveredAt || order.createdAt).toDateString();
    for (const key in weeklyDataMap) {
      if (weeklyDataMap[key].dateStr === orderDate) {
        weeklyDataMap[key].earnings += (order.deliveryFee || 15);
      }
    }
  });

  const weeklyData = Object.values(weeklyDataMap);
  const recentDeliveries = await Order.find({ deliveryBoyId, status: 'delivered' })
    .populate('vendorId', 'shopName')
    .sort({ deliveredAt: -1 })
    .limit(3);

  res.json({
    profile: deliveryBoy,
    stats: {
      totalDeliveries: deliveryBoy.totalDeliveries,
      rating: deliveryBoy.rating,
      earnings: deliveryBoy.earnings, // Lifetime
      todaysEarnings,
      todaysOrders: todaysOrders.length
    },
    weeklyData,
    recentDeliveries
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

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;
      
      // Notify other riders to remove this from their radar
      io.to('role:delivery').emit('order:accepted_by_other', { orderId: order._id });
      
      // Notify student & vendor
      io.to(studentRoom).emit('order:rider_assigned', { orderId: order._id, riderName: req.user.name });
      io.to(vendorRoom).emit('order:rider_assigned', { orderId: order._id, riderName: req.user.name });
    }

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
    order.pickedUpAt = Date.now();
    await order.save();
    
    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;
      const msg = '🛵 Zoom zoom! Your rider just picked up your food and is on the way!';
      io.to(studentRoom).emit('order:picked', { orderId: order._id, message: msg });
      io.to(vendorRoom).emit('order:status_update', { orderId: order._id, status: 'picked_up' });
      io.to(vendorRoom).emit('order:picked', { orderId: order._id });

      const notification = await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'order_update',
        orderId: order._id
      });
      io.to(studentRoom).emit('notification', notification);

      // --- NEW: Mobile Bar Alert ---
      sendPushNotification(order.studentId, "Out for Delivery! 🛵", "Your rider has picked up your food and is on the way.", order._id);
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
      
      const riderRoom = `delivery:${req.user._id}`;
      io.to(riderRoom).emit('rider:stats_update', { message: "Earnings Updated! 🎉" });

      await Notification.create({ recipient: order.studentId, message: studentMsg, type: 'order_update', orderId: order._id });
      await Notification.create({ recipient: order.vendorId, message: vendorMsg, type: 'order_update', orderId: order._id });
      
      // Removed redundant 'notification' emits as 'order:delivered' already handles the UI toast
    }

    // --- NEW: Multi-Channel Delivery Status (Push & Email) ---
    // Wrapped in an async IIFE to avoid blocking, but handled with internal error catching
    (async () => {
      try {
        const userId = order.studentId?._id || order.studentId;
        await sendPushNotification(userId, "Order Delivered! 🎉", `Enjoy your meal from ${order.vendorId?.shopName || 'CampusEats'}!`, order._id);
      } catch (err) {
        console.error('❌ Notification background failure:', err.message);
      }
    })();

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

      await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'system',
        orderId: order._id
      });
      // io.to(studentRoom).emit('notification', notification); // REMOVED redundant notification emit
    }

    res.status(200).json({ message: 'Delivery PIN pushed to Student App Notifications' });
  } else { 
    res.status(404); throw new Error('Order not found or not assigned to you'); 
  }
});

const markArrivedAtVendor = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
     order.arrivedAtVendorAt = Date.now();
     await order.save();
     
     const io = req.app.get('io');
     if (io) {
       const studentRoom = `student:${order.studentId?._id || order.studentId}`;
       io.to(studentRoom).emit('order:arrived', { orderId: order._id, message: "🛵 Your rider has arrived at the restaurant!" });
     }
     
     res.json(order);
  } else {
     res.status(404); throw new Error('Order not found or not assigned to you');
  }
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);

  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    // SECURITY: Cannot cancel if already picked up or beyond
    if (!['placed', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
      res.status(400);
      throw new Error(`Cannot cancel duty. Current status is ${order.status}`);
    }

    // Unassign Rider from Order & Save Reason
    order.deliveryBoyId = null;
    order.cancellationReason = reason || 'Unspecified';
    await order.save();

    // Reset Rider Profile
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = null;
    deliveryBoy.isAvailable = true;
    await deliveryBoy.save();

    // Notify System (Socket)
    const io = req.app.get('io');
    if (io) {
      // Broadcast that a new duty is available again
      io.emit('order:new', { orderId: order._id });
    }

    res.json({ message: 'Duty cancelled successfully. You are now available for other orders.' });
  } else {
    res.status(404);
    throw new Error('Order not found or not assigned to you');
  }
});

module.exports = { getDashboardStats, toggleAvailability, getAvailableOrders, acceptOrder, pickUpOrder, deliverOrder, getOrderById, sendDeliveryOTP, cancelOrder, markArrivedAtVendor };
