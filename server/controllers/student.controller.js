const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

const getVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ isOpen: true, isApproved: true }).populate('userId', 'name profilePic');
  res.json(vendors);
});

const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('userId', 'name profilePic');
  if (vendor) {
    const menu = await MenuItem.find({ vendorId: req.params.id });
    res.json({ vendor, menu });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

const searchItems = asyncHandler(async (req, res) => {
  const keyword = req.query.query ? { name: { $regex: req.query.query, $options: 'i' } } : {};
  // Find all matching items
  const items = await MenuItem.find({ ...keyword }).populate('vendorId', 'shopName location rating isOpen isApproved');
  
  // Filter out items belonging to unapproved or closed vendors, or out of stock
  const verifiedItems = items.filter(item => item.vendorId && item.vendorId.isApproved && item.vendorId.isOpen && item.isAvailable !== false);
  
  res.json(verifiedItems);
});

const calculateOrderBill = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.json({ subtotal: 0, distance: 0, deliveryFee: 0, platformFee: 0, taxes: 0, finalTotal: 0 });
  }

  let subtotal = 0;
  for (const item of items) {
    const menuItem = await MenuItem.findById(item.menuItemId || item._id);
    if (menuItem) {
      subtotal += menuItem.price * item.quantity;
    }
  }

  const distance = 1.2; // Constant distance or calculated via vendor proximity
  const deliveryFee = subtotal > 200 ? 0 : 15; // Free delivery over 200 INR
  const platformFee = 5;
  const taxes = Number((subtotal * 0.05).toFixed(2));
  const finalTotal = Number((subtotal + deliveryFee + platformFee + taxes).toFixed(2));

  res.json({ subtotal, distance, deliveryFee, platformFee, taxes, finalTotal });
});

const generateSecureBill = async (vendorId, items) => {
  let subtotal = 0;
  let verifiedItems = [];

  for (const item of items) {
    const menuItem = await MenuItem.findById(item.menuItemId || item._id);
    if (menuItem && menuItem.vendorId.toString() === vendorId.toString()) {
      if (menuItem.isAvailable === false) {
        throw new Error(`Sorry, "${menuItem.name}" is currently out of stock.`);
      }
      subtotal += menuItem.price * item.quantity;
      verifiedItems.push({
        menuItemId: menuItem._id,
        quantity: item.quantity,
        price: menuItem.price // Always use Database price, never trust frontend payload
      });
    }
  }

  if (verifiedItems.length === 0) {
    throw new Error('No valid items found from this vendor. Cart might be corrupted.');
  }

  const deliveryFee = subtotal > 200 ? 0 : 15;
  const platformFee = 5;
  const taxes = Number((subtotal * 0.05).toFixed(2));
  const finalTotal = Number((subtotal + deliveryFee + platformFee + taxes).toFixed(2));

  return { verifiedItems, subtotal, deliveryFee, platformFee, taxes, finalTotal };
};

const placeOrder = asyncHandler(async (req, res) => {
  const { vendorId, items, deliveryAddress, paymentId, specialInstructions, scheduledFor } = req.body;
  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  const bill = await generateSecureBill(vendorId, items);

  // Calculate Smart ETAs: 15 mins base + 5 mins per unique item
  let estimatedDeliveryTime = new Date();
  if (scheduledFor) {
    estimatedDeliveryTime = new Date(scheduledFor);
  } else {
    const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
    const prepMinutes = 15 + (totalQty * 2); // 15 mins base + 2 mins per item
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + prepMinutes);
  }

  const orderId = 'ORD' + Date.now();
  const order = new Order({
    orderId, 
    studentId: req.user._id, 
    vendorId, 
    items: bill.verifiedItems, 
    deliveryAddress, 
    totalAmount: bill.finalTotal, 
    taxAmount: bill.taxes,
    deliveryFee: bill.deliveryFee,
    platformFee: bill.platformFee,
    paymentId, 
    specialInstructions,
    scheduledFor,
    estimatedDeliveryTime,
    status: 'pending_payment' // Will remain hidden from vendors until payment verifies
  });
  
  const createdOrder = await order.save();
  
  // NOTE: We do NOT notify the vendor here.
  // The vendor is only notified in payment.controller.js -> verifyPayment()
  // AFTER the Razorpay signature is confirmed. This prevents phantom unpaid
  // orders from appearing on the vendor's dashboard.
  
  res.status(201).json(createdOrder);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ studentId: req.user._id })
    .populate('vendorId', 'shopName')
    .populate('items.menuItemId', 'name')
    .sort({ createdAt: -1 });
  res.json(orders);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('vendorId', 'shopName location').populate('deliveryBoyId', 'vehicleType rating userId');
  if (order && order.studentId.toString() === req.user._id.toString()) res.json(order);
  else { res.status(404); throw new Error('Order not found'); }
});

const createVendorReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const vendorId = req.params.id;

  const vendor = await Vendor.findById(vendorId);

  if (vendor) {
    const alreadyReviewed = vendor.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Vendor already reviewed by you');
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    vendor.reviews.push(review);
    vendor.numReviews = vendor.reviews.length;
    vendor.rating = vendor.reviews.reduce((acc, item) => item.rating + acc, 0) / vendor.reviews.length;

    await vendor.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

const toggleFavorite = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;
  const user = await User.findById(req.user._id);
  
  if (!user) { res.status(404); throw new Error('User not found'); }
  
  const isSelected = user.favorites.includes(vendorId);
  if (isSelected) {
    user.favorites = user.favorites.filter(id => id.toString() !== vendorId.toString());
  } else {
    user.favorites.push(vendorId);
  }
  
  await user.save();
  res.json({ favorites: user.favorites });
});

const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    populate: { path: 'userId', select: 'name profilePic' }
  });
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json(user.favorites);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.studentId.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
  
  // Can only cancel if placed or pending_payment, not yet confirmed by vendor
  const cancellableStatuses = ['placed', 'pending_payment'];
  if (!cancellableStatuses.includes(order.status)) { 
    res.status(400); 
    throw new Error('Order cannot be cancelled once it is being prepared. Please contact the vendor.'); 
  }

  order.status = 'cancelled';
  await order.save();
  
  const io = req.app.get('io');
  if (io) {
    const msg = `❌ Heads up! Order #${order.orderId} was cancelled by the student.`;
    io.to(`vendor:${order.vendorId}`).emit('order:cancelled', { orderId: order._id, message: msg });

    // Persist
    const notification = await Notification.create({
      recipient: order.vendorId,
      message: msg,
      type: 'order_update',
      orderId: order._id
    });

    // --- NEW: Real-time Socket Emission ---
    io.to(`vendor:${order.vendorId}`).emit('notification', notification);
  }

  res.json({ message: 'Order cancelled successfully' });
});

const rateOrder = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    res.status(400); throw new Error('Valid rating between 1 and 5 is required');
  }

  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.studentId.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
  if (order.status !== 'delivered') { res.status(400); throw new Error('You can only rate an order after it has been delivered'); }
  if (order.rating) { res.status(400); throw new Error('This order has already been rated'); }

  order.rating = Number(rating);
  if (review) order.review = review;
  await order.save();

  const vendor = await Vendor.findById(order.vendorId);
  if (vendor) {
    if (!vendor.totalRatings) vendor.totalRatings = vendor.numReviews || 0;
    if (!vendor.ratingSum) vendor.ratingSum = (vendor.rating || 0) * vendor.totalRatings;
    
    vendor.totalRatings += 1;
    vendor.ratingSum += Number(rating);
    vendor.rating = Number((vendor.ratingSum / vendor.totalRatings).toFixed(1));
    await vendor.save();
  }

  res.json({ message: 'Rating submitted successfully', order });
});

const subscribeToPush = asyncHandler(async (req, res) => {
  const subscription = req.body;
  const user = await User.findById(req.user._id);
  if (user) {
    user.pushSubscription = subscription;
    await user.save();
    res.status(201).json({ message: 'Push subscription saved' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = { getVendors, getVendorById, searchItems, calculateOrderBill, placeOrder, getMyOrders, getOrderById, createVendorReview, toggleFavorite, getFavorites, cancelOrder, rateOrder, subscribeToPush };
