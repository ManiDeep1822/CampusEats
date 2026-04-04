const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/notification.utils');
const webpush = require('web-push');

// Guard against missing VAPID keys to prevent crashing on startup
if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error('Error setting VAPID details:', err.message);
  }
} else {
  console.warn('⚠️  VAPID keys not configured — web push notifications will be disabled.');
}

const getMyVendorId = async (userId) => {
  const vendor = await Vendor.findOne({ userId });
  if (!vendor) throw new Error('Vendor profile not found');
  return vendor._id;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const vendor = await Vendor.findById(vendorId);
  const orders = await Order.find({ vendorId, status: 'delivered' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  
  const todaysOrders = orders.filter(o => o.deliveredAt >= today);
  const revenue = todaysOrders.reduce((acc, order) => acc + (order.vendorEarnings || 0), 0);
  
  const allOrders = await Order.find({ vendorId });
  const pendingOrders = allOrders.filter(o => ['placed', 'confirmed', 'preparing'].includes(o.status)).length;
  
  const weeklyDataMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyDataMap[dayName] = { name: dayName, sales: 0, dateStr: d.toDateString() };
  }

  orders.forEach(order => {
    const orderDate = new Date(order.deliveredAt).toDateString();
    for (const key in weeklyDataMap) {
      if (weeklyDataMap[key].dateStr === orderDate) {
        weeklyDataMap[key].sales += (order.vendorEarnings || 0);
      }
    }
  });

  const weeklyData = Object.values(weeklyDataMap);

  const popularItems = await Order.aggregate([
    { $match: { vendorId: vendorId, status: 'delivered' } },
    { $unwind: "$items" },
    { $group: { 
        _id: "$items.menuItemId", 
        totalSold: { $sum: "$items.quantity" }, 
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } 
    } },
    { $sort: { totalSold: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'menuitems', localField: '_id', foreignField: '_id', as: 'itemDetails' } },
    { $unwind: "$itemDetails" },
    { $project: { name: "$itemDetails.name", image: "$itemDetails.image", totalSold: 1, revenue: 1 } }
  ]);

  res.json({ 
    shopDetails: vendor, 
    stats: { 
      todaysOrders: todaysOrders.length, 
      revenue, // Today's Earnings
      lifetimeEarnings: vendor.earnings || 0,
      pendingPayout: vendor.pendingPayout || 0,
      pendingOrders, 
      rating: vendor.rating 
    }, 
    weeklyData, 
    popularItems 
  });
});

const toggleShopStatus = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const vendor = await Vendor.findById(vendorId);
  vendor.isOpen = !vendor.isOpen;
  await vendor.save();
  res.json({ isOpen: vendor.isOpen });
});

const getMenu = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  res.json(await MenuItem.find({ vendorId }));
});

const addMenuItem = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const { name, description, price, category, image, isAvailable, preparationTime, isVeg } = req.body;
  const item = new MenuItem({ 
    name, description, price, category, image, isAvailable, preparationTime, isVeg,
    vendorId 
  });
  res.status(201).json(await item.save());
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const item = await MenuItem.findById(req.params.id);
  if (item && item.vendorId.toString() === vendorId.toString()) {
    const { name, description, price, category, image, isAvailable, preparationTime, isVeg } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (category !== undefined) item.category = category;
    if (image !== undefined) item.image = image;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;
    if (preparationTime !== undefined) item.preparationTime = preparationTime;
    if (isVeg !== undefined) item.isVeg = isVeg;
    
    res.json(await item.save());
  } else { res.status(404); throw new Error('Menu item not found'); }
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const item = await MenuItem.findById(req.params.id);
  if (item && item.vendorId.toString() === vendorId.toString()) {
    await item.deleteOne();
    res.json({ message: 'Menu item removed' });
  } else { res.status(404); throw new Error('Menu item not found'); }
});

const toggleMenuItemStatus = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const item = await MenuItem.findById(req.params.id);
  if (item && item.vendorId.toString() === vendorId.toString()) {
    item.isAvailable = item.isAvailable === false ? true : false; 
    await item.save();
    res.json({ isAvailable: item.isAvailable, message: 'Stock status updated' });
  } else { 
    res.status(404); 
    throw new Error('Menu item not found'); 
  }
});

const getOrders = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const orders = await Order.find({ vendorId })
    .populate('studentId', 'name phone')
    .populate({
      path: 'deliveryBoyId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('items.menuItemId')
    .sort({ createdAt: -1 });
  res.json(orders);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  let { status, prepTime } = req.body;
  const order = await Order.findById(req.params.id).populate('items.menuItemId');
  
  if (order && order.vendorId.toString() === vendorId.toString()) {
    if (order.status === 'cancelled' || order.status === 'delivered') {
      res.status(400);
      throw new Error(`Cannot update order because it is already ${order.status}`);
    }

    // --- SWIGGY/ZOMATO STYLE WORKFLOW ---
    // If vendor clicks ACCEPT (status: confirmed), we auto-trigger PREPARING
    if (status === 'confirmed' || status === 'preparing') {
      status = 'preparing'; // Final target status

      // Auto-calculate prepTime if not provided
      if (!prepTime) {
        const itemPrepTimes = order.items.map(i => i.menuItemId?.preparationTime || 15);
        prepTime = Math.max(...itemPrepTimes) + (order.items.length > 1 ? (order.items.length - 1) * 2 : 0);
      }
    }

    // --- TAKE AWAY OTP VERIFICATION ---
    if (order.orderType === 'take_away' && status === 'delivered') {
      const { otp } = req.body;
      if (!otp || otp !== order.deliveryOtp) {
        res.status(400);
        throw new Error('Invalid Pickup PIN. Please get the correct 6-digit PIN from the student.');
      }
      order.deliveredAt = Date.now();
    }

    if (status) order.status = status;
    if (prepTime) order.estimatedTime = prepTime;
    
    await order.save(); // Persist changes
    
    // Re-populate for consistent UI response (Matching getOrders population)
    await order.populate([
      { path: 'studentId', select: 'name phone' },
      { path: 'items.menuItemId' },
      { 
        path: 'deliveryBoyId',
        populate: { path: 'userId', select: 'name' }
      }
    ]);
    
    const io = req.app.get('io');
    if (io) {
      let studentMsg = `Your order status changed to ${status}`;
      let title = "Order Update";
      
      if (status === 'preparing') {
        studentMsg = `🎊 Booking Confirmed! The kitchen is preparing your food #${order.orderId.slice(-4)}.`;
        title = "Booking Confirmed! 🎊";
      } else if (status === 'ready') {
        studentMsg = "🥡 Piping hot! Your order is packed and waiting for a rider.";
        title = "Order Ready! 🥡";
      }

      const recipientId = order.studentId?._id || order.studentId;
      
      // 1. Create DB Notification
      const notification = await Notification.create({
        recipient: recipientId,
        message: studentMsg,
        type: 'order_update',
        orderId: order._id
      });

      // 2. Emit Real-time Socket Event
      io.to(`student:${recipientId}`).emit(`order:${status}`, { 
        orderId: order._id, 
        message: studentMsg,
        status,
        estimatedTime: order.estimatedTime 
      });
      io.to(`student:${recipientId}`).emit('notification', notification);

      // 3. Push Notification
      if (['preparing', 'ready'].includes(status)) {
        try {
          sendPushNotification(recipientId, title, studentMsg, { orderId: order._id });
        } catch (e) {
          console.error('Push notification failed:', e.message);
        }
      }

      // Notify vendor (self and other sessions)
      io.to(`vendor:${order.vendorId?._id || order.vendorId}`).emit('order:status_update', { orderId: order._id, status });
      
      if (status === 'ready') {
        const vendorName = (await order.populate('vendorId')).vendorId?.shopName || 'Campus Spot';
        io.to('role:delivery').emit('order:ready', { orderId: order._id, message: `🛵 An order is ready for pickup at ${vendorName}` });
      }
    }
    
    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found'); 
  }
});

const updateVendorProfile = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const vendor = await Vendor.findById(vendorId);

  if (vendor) {
    // M6: Whitelist allowed fields to prevent arbitrary updates
    const { shopImage, shopName, location, cuisineType, operatingHours, paymentDetails } = req.body;
    
    if (shopImage !== undefined) vendor.shopImage = shopImage;
    if (shopName) vendor.shopName = shopName;
    if (location) vendor.location = location;
    if (cuisineType !== undefined) vendor.cuisineType = cuisineType;
    if (operatingHours !== undefined) vendor.operatingHours = operatingHours;
    if (paymentDetails !== undefined) vendor.paymentDetails = paymentDetails;

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

const getVendorPayments = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const orders = await Order.find({ 
    vendorId, 
    status: { $in: ['delivered', 'ready', 'picked_up'] } 
  })
    .populate('studentId', 'name phone email')
    .populate('paymentId')
    .sort({ createdAt: -1 });
    
  res.json(orders);
});

module.exports = { getDashboardStats, toggleShopStatus, getMenu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStatus, getOrders, updateOrderStatus, updateVendorProfile, getVendorPayments };
