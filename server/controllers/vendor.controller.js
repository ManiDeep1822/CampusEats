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
  const { name, description, price, category, image, isAvailable, preparationTime } = req.body;
  const item = new MenuItem({ 
    name, description, price, category, image, isAvailable, preparationTime,
    vendorId 
  });
  res.status(201).json(await item.save());
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const vendorId = await getMyVendorId(req.user._id);
  const item = await MenuItem.findById(req.params.id);
  if (item && item.vendorId.toString() === vendorId.toString()) {
    const { name, description, price, category, image, isAvailable, preparationTime } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (category !== undefined) item.category = category;
    if (image !== undefined) item.image = image;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;
    if (preparationTime !== undefined) item.preparationTime = preparationTime;
    
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
      const originalStatus = status;
      status = 'preparing'; // Final target status

      // Auto-calculate prepTime if not provided
      if (!prepTime) {
        const itemPrepTimes = order.items.map(i => i.menuItemId?.preparationTime || 15);
        prepTime = Math.max(...itemPrepTimes) + (order.items.length > 1 ? (order.items.length - 1) * 2 : 0);
      }
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
      if (status === 'preparing') studentMsg = "🍳 Great news! The vendor has accepted and started preparing your food.";
      else if (status === 'ready') studentMsg = "🛍️ Piping hot! Your order is packed and waiting for a rider.";

      // Notify student of the final status
      io.to(`student:${order.studentId?._id || order.studentId}`).emit(`order:${status}`, { 
        orderId: order._id, 
        message: studentMsg,
        estimatedTime: order.estimatedTime 
      });

      // Notify vendor (self and other sessions)
      io.to(`vendor:${order.vendorId?._id || order.vendorId}`).emit('order:status_update', { orderId: order._id, status });
      
      // Persist Notification to DB
      const notification = await Notification.create({
        recipient: order.studentId,
        message: studentMsg,
        type: 'order_update',
        orderId: order._id
      });

      io.to(`student:${order.studentId?._id || order.studentId}`).emit('notification', notification);
      
      // Push Notification Support
      if (['preparing', 'ready'].includes(status)) {
        const studentId = order.studentId?._id || order.studentId;
        const statusTitles = {
          preparing: "Cooking Started! 🍳",
          ready: "Order Ready! 🛍️"
        };
        const statusBodies = {
          preparing: `The chef is preparing your meal. Est. time: ${order.estimatedTime} mins.`,
          ready: "Your order is ready and waiting for a rider."
        };

        sendPushNotification(
          studentId, 
          `CampusEats: ${statusTitles[status]}`, 
          statusBodies[status], 
          order._id
        );
      }
      
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
    if (req.body.shopImage !== undefined) vendor.shopImage = req.body.shopImage;
    if (req.body.shopName) vendor.shopName = req.body.shopName;
    if (req.body.location) vendor.location = req.body.location;
    if (req.body.cuisineType !== undefined) vendor.cuisineType = req.body.cuisineType;
    if (req.body.operatingHours !== undefined) vendor.operatingHours = req.body.operatingHours;

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

module.exports = { getDashboardStats, toggleShopStatus, getMenu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStatus, getOrders, updateOrderStatus, updateVendorProfile };
