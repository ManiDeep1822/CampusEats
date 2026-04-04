const asyncHandler = require('express-async-handler');
const DeliveryBoy = require('../models/DeliveryBoy');
const Vendor = require('../models/Vendor');
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
  const weeklyEarnings = weeklyData.reduce((acc, curr) => acc + curr.earnings, 0);

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
      weeklyEarnings,
      pendingPayout: deliveryBoy.pendingPayout || 0,
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
  const orders = await Order.find({ 
    status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }, 
    deliveryBoyId: null,
    orderType: 'delivery' 
  })
    .populate('vendorId', 'shopName location')
    .populate('studentId', 'name phone')
    .sort({ updatedAt: -1 });
  res.json(orders);
});

const acceptOrder = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  // Use an atomic update to prevent race conditions during order acceptance
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }, deliveryBoyId: null },
    { $set: { deliveryBoyId: deliveryBoyId } },
    { new: true }
  );
  
  if (updatedOrder) {
    await DeliveryBoy.findByIdAndUpdate(
      deliveryBoyId,
      { $set: { activeOrderId: updatedOrder._id, isAvailable: false } },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${updatedOrder.studentId?._id || updatedOrder.studentId}`;
      const vendorRoom = `vendor:${updatedOrder.vendorId?._id || updatedOrder.vendorId}`;
      
      // Notify other riders to remove this from their radar
      io.to('role:delivery').emit('order:accepted_by_other', { orderId: updatedOrder._id });
      
      // Notify student & vendor
      io.to(studentRoom).emit('order:rider_assigned', { orderId: updatedOrder._id, riderName: req.user.name });
      io.to(vendorRoom).emit('order:rider_assigned', { orderId: updatedOrder._id, riderName: req.user.name });
    }

    res.json(updatedOrder);
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
      const msg = '🛵 Zoom zoom! Your rider just picked up your food and is on the way!';
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;

      const recipientId = order.studentId?._id || order.studentId;
      const studentRoom = `student:${recipientId}`;
      io.to(studentRoom).emit('order:picked', { orderId: order._id, message: msg });

      const notification = await Notification.create({
        recipient: recipientId,
        message: msg,
        type: 'order_update',
        orderId: order._id
      });
      io.to(studentRoom).emit('notification', notification);

      // --- NEW: Mobile Bar Alert ---
      sendPushNotification(recipientId, "Out for Delivery! 🛵", "Your rider has picked up your food and is on the way.", order._id);

      io.to(vendorRoom).emit('order:status_update', { orderId: order._id, status: 'picked_up' });
      io.to(vendorRoom).emit('order:picked', { orderId: order._id });
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

    if (order.isCommissionSplit) {
      res.status(400); 
      throw new Error('This order has already been settled.');
    }

    // --- SECURE PAYMENT SPLIT (Audited Net Earnings) ---
    // Calculate subtotal from items to ensure vendor gets paid even on 100% discount orders
    const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Vendor gets Subtotal - 5% Platform Commission (Example 5%)
    const vendorShare = Math.round(subtotal * 0.95); 
    const riderShare = order.deliveryFee || 15;
    
    // Admin Net = (What Student Paid) - (What we owe Vendor) - (What we owe Rider)
    // This will be negative if the discount was larger than our commission + fees
    const adminShare = order.totalAmount - vendorShare - riderShare;

    order.status = 'delivered';
    order.deliveredAt = Date.now();
    order.deliveryOtp = undefined; 
    
    // Snapshots for Audit (Secure Internal Ledger)
    order.vendorEarnings = vendorShare;
    order.deliveryEarnings = riderShare;
    order.adminEarnings = adminShare;
    order.isCommissionSplit = true;
    
    await order.save();

    // Update Vendor's pending payout balance
    const vendor = await Vendor.findById(order.vendorId);
    if (vendor) {
      vendor.pendingPayout = (vendor.pendingPayout || 0) + vendorShare;
      vendor.lifetimeEarnings = (vendor.lifetimeEarnings || 0) + vendorShare;
      await vendor.save();
    }

    // Update Rider's pending payout balance
    const rider = await DeliveryBoy.findById(order.deliveryBoyId);
    if (rider) {
      rider.pendingPayout = (rider.pendingPayout || 0) + riderShare;
      rider.lifetimeEarnings = (rider.lifetimeEarnings || 0) + riderShare;
      await rider.save();
    }
    
    // 1. Update Rider Profile
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = null;
    deliveryBoy.isAvailable = true;
    deliveryBoy.totalDeliveries += 1;
    deliveryBoy.earnings += riderShare;
    deliveryBoy.pendingPayout += riderShare; // Add to current pending balance
    await deliveryBoy.save();

    // 2. Update Vendor Profile (Securely)
    await Vendor.findByIdAndUpdate(order.vendorId, {
       $inc: { earnings: vendorShare, pendingPayout: vendorShare, totalOrders: 1 }
    });

    const io = req.app.get('io');
    if (io) {
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;
      const studentMsg = '✅ Delivered! Enjoy your CampusEats meal!';
      const vendorMsg = `✅ Order #${order.orderId} was successfully delivered by the rider. Earnings: ₹${vendorShare}`;
      
      const recipientId = order.studentId?._id || order.studentId;
      const studentRoom = `student:${recipientId}`;
      
      io.to(studentRoom).emit('order:delivered', { orderId: order._id, message: studentMsg });
      await Notification.create({ recipient: recipientId, message: studentMsg, type: 'order_update', orderId: order._id });
      sendPushNotification(recipientId, "Order Delivered! 🎉", `Enjoy your meal from ${order.vendorId?.shopName || 'CampusEats'}!`, order._id);

      io.to(vendorRoom).emit('order:delivered', { orderId: order._id, message: vendorMsg });
      await Notification.create({ recipient: order.vendorId?._id || order.vendorId, message: vendorMsg, type: 'order_update', orderId: order._id });
      
      const riderRoom = `delivery:${req.user._id}`;
      io.to(riderRoom).emit('rider:stats_update', { message: `Earnings Updated: +₹${riderShare} 🎉` });
    }

    // --- Background Notifications ---
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

const getDeliveryPayments = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const orders = await Order.find({ deliveryBoyId, status: 'delivered' })
    .populate('vendorId', 'shopName location')
    .sort({ deliveredAt: -1 });
    
  res.json(orders);
});

const updateRiderProfile = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

  if (deliveryBoy) {
    const { vehicleType, paymentDetails } = req.body;
    
    if (vehicleType !== undefined) deliveryBoy.vehicleType = vehicleType;
    if (paymentDetails !== undefined) deliveryBoy.paymentDetails = paymentDetails;

    const updatedRider = await deliveryBoy.save();
    res.json(updatedRider);
  } else {
    res.status(404);
    throw new Error('Rider not found');
  }
});

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, currentLocation } = req.body;
  const deliveryBoyId = await getMyDeliveryId(req.user._id);

  const rider = await DeliveryBoy.findByIdAndUpdate(
    deliveryBoyId,
    { 
      $set: { 
        locationCoordinates: { lat, lng },
        currentLocation: currentLocation || undefined
      } 
    },
    { new: true }
  );

  if (!rider) {
    res.status(404);
    throw new Error('Rider profile not found');
  }

  // If rider has an active order, notify the student via Socket
  if (rider.activeOrderId) {
    const io = req.app.get('io');
    if (io) {
      io.to(`student_order:${rider.activeOrderId}`).emit('rider_location_update', {
        orderId: rider.activeOrderId,
        lat,
        lng,
        timestamp: Date.now()
      });
    }
  }

  res.json({ success: true, coordinates: rider.locationCoordinates });
});

module.exports = { 
  getDashboardStats, 
  toggleAvailability, 
  getAvailableOrders, 
  acceptOrder, 
  pickUpOrder, 
  deliverOrder, 
  getOrderById, 
  sendDeliveryOTP, 
  cancelOrder, 
  markArrivedAtVendor, 
  getDeliveryPayments,
  updateRiderProfile,
  updateLocation
};
