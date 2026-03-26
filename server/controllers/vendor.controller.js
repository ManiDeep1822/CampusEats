const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Notification = require('../models/Notification');
const webpush = require('web-push');

// Guard against missing VAPID keys to prevent crashing on startup
if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
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
  const orders = await Order.find({ vendorId });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter(o => o.createdAt >= today);
  const revenue = todaysOrders.reduce((acc, order) => acc + order.totalAmount, 0);
  const pendingOrders = todaysOrders.filter(o => ['placed', 'confirmed', 'preparing'].includes(o.status)).length;
  
  const weeklyDataMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyDataMap[dayName] = { name: dayName, sales: 0, dateStr: d.toDateString() };
  }

  orders.forEach(order => {
    const orderDate = new Date(order.createdAt).toDateString();
    for (const key in weeklyDataMap) {
      if (weeklyDataMap[key].dateStr === orderDate && order.status === 'delivered') {
        weeklyDataMap[key].sales += order.totalAmount;
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

  res.json({ shopDetails: vendor, stats: { todaysOrders: todaysOrders.length, revenue, pendingOrders, rating: vendor.rating }, weeklyData, popularItems });
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
  const item = new MenuItem({ ...req.body, vendorId });
  res.status(201).json(await item.save());
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const item = await MenuItem.findById(req.params.id);
  if (item && item.vendorId.toString() === vendorId.toString()) {
    Object.assign(item, req.body);
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
  res.json(await Order.find({ vendorId }).populate('studentId', 'name phone').sort({ createdAt: -1 }));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const { status, prepTime } = req.body;
  const order = await Order.findById(req.params.id);
  
  if (order && order.vendorId.toString() === vendorId.toString()) {
    if (order.status === 'cancelled' || order.status === 'delivered') {
      res.status(400);
      throw new Error(`Cannot update order because it is already ${order.status}`);
    }

    if (status) order.status = status;
    if (prepTime) order.estimatedTime = prepTime;
    
    await order.save();
    
    const io = req.app.get('io');
    if (io) {
      let studentMsg = `Your order status changed to ${status}`;
      if (status === 'confirmed') studentMsg = "🎉 Great news! The vendor just accepted your order!";
      else if (status === 'preparing') studentMsg = "🍳 The chef is firing up the stove! Your food is being prepared.";
      else if (status === 'ready') studentMsg = "🛍️ Piping hot! Your order is packed and waiting for a rider.";

      io.to(`student:${order.studentId}`).emit(`order:${status}`, { orderId: order._id, message: studentMsg });
      
      // Persist Notification to DB
      const notification = await Notification.create({
        recipient: order.studentId,
        message: studentMsg,
        type: 'order_update',
        orderId: order._id
      });

      // --- NEW: Real-time Socket Emission ---
      io.to(`student:${order.studentId}`).emit('notification', notification);
      
      if (status === 'ready') {
        const populatedOrder = await Order.findById(order._id).populate('vendorId');
        const vendorName = populatedOrder.vendorId?.shopName || 'Campus Spot';
        
        // --- FIX: Targeted broadcast to all DELIVER boys only, not everyone ---
        io.to('role:delivery').emit('order:ready', { orderId: order._id, message: `🛵 An order is ready for pickup at ${vendorName}` });
        
        const student = await User.findById(order.studentId);
        if (student && student.pushSubscription) {
          const payload = JSON.stringify({
            title: 'CampusEats: Order Ready! 🛍️',
            body: `Fresh and hot! Your order from ${vendorName} is ready for pickup.`,
            icon: '/pwa-icon.svg',
            data: { url: `/student/tracking/${order._id}` }
          });
          webpush.sendNotification(student.pushSubscription, payload).catch(err => console.error('Push error:', err));
        }
      }
    }
    
    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found'); 
  }
});

module.exports = { getDashboardStats, toggleShopStatus, getMenu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStatus, getOrders, updateOrderStatus };
