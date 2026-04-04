const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const { generateReceiptHTML } = require('../utils/receiptTemplate');

// Helper to calculate delivery fees based on distance
const calculateDeliveryFee = (subtotal, distance = 1.2) => {
  if (subtotal > 200) return 0; // Free delivery over 200 INR for normal orders
  const baseFee = 15;
  const distanceFee = Math.max(0, Math.floor(distance) * 5); // ₹5 per km
  return baseFee + distanceFee;
};

const getVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ isApproved: true }).populate('userId', 'name profilePic');
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

// Helper to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
};

const searchItems = asyncHandler(async (req, res) => {
  const queryTerm = String(req.query.query || '').trim();
  if (!queryTerm) return res.json({ vendors: [], items: [], query: '' });

  try {
    const tokens = escapedTerm.split(/\s+/).filter(t => t.length > 0);
    const tokenRegex = tokens.join('|');
    const regex = { $regex: tokenRegex, $options: 'i' };

    // Search vendors by shop name OR cuisine type OR location
    const vendors = await Vendor.find({
      isApproved: true,
      $or: [
        { shopName: regex },
        { cuisineType: { $in: tokens.map(t => new RegExp(t, 'i')) } },
        { location: regex },
      ]
    })
    .populate('userId', 'name profilePic')
    .lean();

    // Search menu items by name, description, OR category
    const items = await MenuItem.find({
      $or: [
        { name: regex }, 
        { description: regex },
        { category: regex }
      ],
      isAvailable: { $ne: false }
    })
    .populate('vendorId', 'shopName location rating isOpen isApproved cuisineType shopImage')
    .lean();

    // Filter out items from unapproved vendors with enhanced safety check
    const verifiedItems = items.filter(item => {
      if (!item.vendorId) return false; 
      return item.vendorId.isApproved === true;
    });

    res.json({ 
      vendors: vendors || [], 
      items: verifiedItems || [], 
      query: queryTerm 
    });

  } catch (error) {
    console.error(`[Search Error] query="${queryTerm}":`, error.message);
    // If it's a MongoDB regex error, return 400 instead of 500
    if (error.message.includes('Regular expression') || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid search query', vendors: [], items: [], query: queryTerm });
    }
    throw error; // Let global handler catch other issues
  }
});


const calculateOrderBill = asyncHandler(async (req, res) => {
  const { items, orderType, couponCode } = req.body;
  
  // M11: Validate orderType enum
  const allowedOrderTypes = ['delivery', 'take_away'];
  if (orderType && !allowedOrderTypes.includes(orderType)) {
    res.status(400); throw new Error('Invalid order type. Must be delivery or take_away.');
  }

  if (!items || items.length === 0) {
    return res.json({ subtotal: 0, distance: 0, deliveryFee: 0, platformFee: 0, taxes: 0, discountAmount: 0, finalTotal: 0 });
  }

  // Bulk Fetch MenuItems to avoid serial DB calls in a loop
  const itemIds = items.map(i => i.menuItemId || i._id);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
  
  let subtotal = 0;
  for (const item of items) {
    const menuItem = menuItems.find(m => m._id.toString() === (item.menuItemId || item._id).toString());
    if (menuItem) {
      subtotal += menuItem.price * item.quantity;
    }
  }

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (coupon) {
      const validation = coupon.isValid(subtotal);
      if (validation.valid) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = coupon.discountValue;
        }
      }
    }
  }

  const distance = 1.2; 
  const deliveryFee = orderType === 'take_away' ? 0 : calculateDeliveryFee(subtotal, distance);
  const platformFee = 5; 
  const taxes = Number((subtotal * 0.05).toFixed(2));
  const finalTotal = Number((subtotal + deliveryFee + platformFee + taxes - discountAmount).toFixed(2));

  res.json({ subtotal, distance, deliveryFee, platformFee, taxes, discountAmount, finalTotal });
});

const applyCoupon = asyncHandler(async (req, res) => {
  const { code, items } = req.body;
  
  if (!code) {
    res.status(400); throw new Error('Coupon code is required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    res.status(404); throw new Error('Invalid coupon code');
  }

  let subtotal = 0;
  // Bulk Fetch MenuItems
  const itemIds = items.map(i => i.menuItemId || i._id);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } });

  for (const item of items) {
    const menuItem = menuItems.find(m => m._id.toString() === (item.menuItemId || item._id).toString());
    if (menuItem) {
      subtotal += menuItem.price * item.quantity;
    }
  }

  const validation = coupon.isValid(subtotal);
  if (!validation.valid) {
    res.status(400); throw new Error(validation.message);
  }

  let discountAmount;
  if (coupon.discountType === 'percentage') {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  res.json({
    code: coupon.code,
    discountAmount: Number(discountAmount.toFixed(2)),
    discountType: coupon.discountType,
    discountValue: coupon.discountValue
  });
});

const generateSecureBill = async (vendorId, items, orderType, couponCode) => {
  let subtotal = 0;
  let verifiedItems = [];

  // Bulk Fetch MenuItems to reduce DB round-trips
  const itemIds = items.map(i => i.menuItemId || i._id);
  const menuItems = await MenuItem.find({ 
    _id: { $in: itemIds },
    vendorId: vendorId 
  });

  for (const item of items) {
    const menuItem = menuItems.find(m => m._id.toString() === (item.menuItemId || item._id).toString());
    if (menuItem) {
      if (menuItem.isAvailable === false) {
        throw new Error(`Sorry, "${menuItem.name}" is currently out of stock.`);
      }
      subtotal += menuItem.price * item.quantity;
      verifiedItems.push({
        menuItemId: menuItem._id,
        quantity: item.quantity,
        price: menuItem.price // Database price
      });
    }
  }

  if (verifiedItems.length === 0) {
    throw new Error('No valid items found from this vendor. Cart might be corrupted.');
  }

  let discountAmount = 0;
  let validCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (coupon) {
      const validation = coupon.isValid(subtotal);
      if (validation.valid) {
        validCoupon = coupon;
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = coupon.discountValue;
        }
      }
    }
  }

  const deliveryFee = orderType === 'take_away' ? 0 : calculateDeliveryFee(subtotal);
  const platformFee = 5;
  const taxes = Number((subtotal * 0.05).toFixed(2));
  const finalTotal = Number((subtotal + deliveryFee + platformFee + taxes - discountAmount).toFixed(2));

  return { verifiedItems, subtotal, deliveryFee, platformFee, taxes, discountAmount, finalTotal, validCoupon };
};

const placeOrder = asyncHandler(async (req, res) => {
  const { vendorId, items, deliveryAddress, paymentId, specialInstructions, scheduledFor, orderType, couponCode } = req.body;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  if (!vendor.isOpen) {
    res.status(400);
    throw new Error(`Sorry, ${vendor.shopName} is currently closed and not accepting orders.`);
  }

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  const bill = await generateSecureBill(vendorId, items, orderType, couponCode);

  // If coupon was applied, increment its usage
  if (bill.validCoupon) {
    bill.validCoupon.usedCount += 1;
    await bill.validCoupon.save();
  }

  // Calculate Smart ETAs: 15 mins base + 5 mins per unique item
  let estimatedDeliveryTime = new Date();
  if (scheduledFor) {
    estimatedDeliveryTime = new Date(scheduledFor);
  } else {
    const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
    const prepMinutes = 15 + (totalQty * 2); // 15 mins base + 2 mins per item
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + prepMinutes);
  }

  // Security Patch: Verification Code for delivery/pickup
  const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const orderId = 'ORD' + Date.now();
  const order = new Order({
    orderId, 
    studentId: req.user._id, 
    vendorId, 
    items: bill.verifiedItems, 
    orderType: orderType || 'delivery',
    deliveryAddress: orderType === 'take_away' ? 'Pickup from Restaurant' : deliveryAddress, 
    totalAmount: bill.finalTotal, 
    taxAmount: bill.taxes,
    deliveryFee: bill.deliveryFee,
    platformFee: bill.platformFee,
    discountAmount: bill.discountAmount,
    couponCode: bill.validCoupon ? bill.validCoupon.code : null,
    paymentId, 
    specialInstructions,
    scheduledFor,
    estimatedDeliveryTime,
    deliveryOtp, // Persist initial OTP
    status: 'pending_payment' // Will remain hidden from vendors until payment verifies
  });
  
  const createdOrder = await order.save();
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

  // M4: Purchase Verification for Reviews
  // Ensure the student has at least one 'delivered' order from this vendor
  const hasPurchased = await Order.findOne({
    studentId: req.user._id,
    vendorId: vendorId,
    status: 'delivered'
  });

  if (!hasPurchased) {
    res.status(403);
    throw new Error('You can only review vendors you have ordered from and received delivery.');
  }

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
    
    // Unify rating calculation logic
    if (!vendor.totalRatings) vendor.totalRatings = vendor.reviews.length - 1; 
    if (!vendor.ratingSum) vendor.ratingSum = (vendor.rating || 0) * vendor.totalRatings;

    vendor.totalRatings += 1;
    vendor.ratingSum += Number(rating);
    vendor.numReviews = vendor.reviews.length;
    vendor.rating = Number((vendor.ratingSum / vendor.totalRatings).toFixed(1));

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

  // M10 Optimization: Use direct atomic updates for high speed
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    isSelected 
      ? { $pull: { favorites: vendorId } }
      : { $addToSet: { favorites: vendorId } },
    { new: true, select: 'favorites' }
  );

  res.json({ favorites: updatedUser.favorites });
});

const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    populate: { path: 'userId', select: 'name profilePic' }
  });
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json(user.favorites);
});


const { refundPayment } = require('./payment.controller');

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.studentId.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
  
  // Policy Check: Can only cancel within 60 seconds of PLACEMENT
  const now = new Date();
  const diffInSeconds = (now - order.createdAt) / 1000;
  
  if (diffInSeconds > 60) {
    res.status(400);
    throw new Error('60-second cancellation window has expired. Please contact support or the vendor.');
  }

  // Can only cancel if placed or pending_payment, not yet confirmed by vendor
  const cancellableStatuses = ['placed', 'pending_payment'];
  if (!cancellableStatuses.includes(order.status)) { 
    res.status(400); 
    throw new Error('Order cannot be cancelled once it is being prepared. Please contact the vendor.'); 
  }

  // Attempt Refund if already paid
  let refundStatus = 'not_started';
  const reason = 'User cancelled within 60s window';
  if (order.status === 'placed') {
      const isRefunded = await refundPayment(order._id, reason);
      refundStatus = isRefunded ? 'success' : 'failed';
  }

  order.status = 'cancelled';
  order.cancellationReason = reason;
  await order.save();
  
  const io = req.app.get('io');
  if (io) {
    const msg = `❌ Heads up! Order #${order.orderId} was cancelled within 60s window. Refund: ${refundStatus}`;
    const vendorRoom = `vendor:${order.vendorId}`;
    io.to(vendorRoom).emit('order:cancelled', { orderId: order._id, message: msg });

    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(order.vendorId).populate('userId', '_id');
    if (vendor && vendor.userId) {
      const notification = await Notification.create({
        recipient: vendor.userId._id,
        message: msg,
        type: 'order_update',
        orderId: order._id
      });
      io.to(`vendor:${vendor.userId._id}`).emit('notification', notification);
    }
  }

  res.json({ 
    message: 'Order cancelled successfully', 
    refundStatus,
    disclaimer: refundStatus === 'success' ? 'Refund initiated. 3-7 business days to reflect.' : 'No payment was made or refund failed.'
  });
});

const rateOrder = asyncHandler(async (req, res) => {
  const { vendorRating, vendorReview, riderRating, riderReview } = req.body;
  
  if (!vendorRating || vendorRating < 1 || vendorRating > 5) {
    res.status(400); throw new Error('Vendor rating is required');
  }

  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.studentId.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
  if (order.status !== 'delivered') { res.status(400); throw new Error('Rate after delivery'); }
  if (order.vendorRating) { res.status(400); throw new Error('Already rated'); }

  // 1. Update Order Document
  order.vendorRating = Number(vendorRating);
  if (vendorReview) order.vendorReview = vendorReview;
  
  const hasRider = order.deliveryBoyId && order.orderType === 'delivery';
  if (hasRider && riderRating) {
    order.riderRating = Number(riderRating);
    if (riderReview) order.riderReview = riderReview;
  }
  
  await order.save();

  // 2. Update Vendor Global Metrics
  const vendor = await Vendor.findById(order.vendorId);
  if (vendor) {
    const total = vendor.numReviews || 0;
    const currentSum = (vendor.rating || 0) * total;
    vendor.numReviews = total + 1;
    vendor.rating = Number(((currentSum + Number(vendorRating)) / (total + 1)).toFixed(1));
    await vendor.save();
  }

  // 3. Update DeliveryBoy Global Metrics & Review Array
  if (hasRider && riderRating) {
    const rider = await DeliveryBoy.findById(order.deliveryBoyId);
    if (rider) {
      // Numerical Rating
      const total = rider.numReviews || 0;
      const currentSum = (rider.rating || 0) * total;
      rider.numReviews = total + 1;
      rider.rating = Number(((currentSum + Number(riderRating)) / (total + 1)).toFixed(1));
      
      // Store Review in array
      rider.reviews.push({
        user: req.user._id,
        name: req.user.name,
        rating: Number(riderRating),
        comment: riderReview || 'No comment provided'
      });
      
      await rider.save();
    }
  }

  res.json({ message: 'Ratings submitted successfully', order });
});

const getOrderReceipt = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('studentId', 'name email address')
    .populate('vendorId', 'shopName location')
    .populate('items.menuItemId', 'name');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Security: only the student who placed the order or an admin can see the receipt
  if (order.studentId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this receipt');
  }

  const receiptHtml = generateReceiptHTML(order);
  res.send(receiptHtml);
});

// @desc    Get available coupons
// @route   GET /api/student/coupons/available
// @access  Private/Student
const getAvailableCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gt: now }
  }).sort({ expiryDate: 1 }); // Soonest expiring first

  // Further check usageLimit vs usedCount manually to be safe
  const validCoupons = coupons.filter(c => {
    if (c.usageLimit === null) return true;
    return c.usedCount < c.usageLimit;
  });

  res.json(validCoupons);
});

// --- ADDRESS MANAGEMENT ---
const getSavedAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user.savedAddresses || []);
});

const addSavedAddress = asyncHandler(async (req, res) => {
  const { address, tag, isDefault } = req.body;
  if (!address) {
    res.status(400);
    throw new Error('Address is required');
  }

  const user = await User.findById(req.user._id);
  
  // If isDefault is true, unset other defaults
  if (isDefault) {
    user.savedAddresses.forEach(a => a.isDefault = false);
  }

  user.savedAddresses.push({ address, tag: tag || 'Other', isDefault: !!isDefault });
  await user.save();
  
  res.status(201).json(user.savedAddresses);
});

const deleteSavedAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.id);
  await user.save();
  res.json(user.savedAddresses);
});

module.exports = { 
  getVendors, 
  getVendorById, 
  searchItems, 
  calculateOrderBill, 
  applyCoupon,
  getAvailableCoupons,
  placeOrder, 
  getMyOrders, 
  getOrderById, 
  rateOrder,
  createVendorReview,
  toggleFavorite,
  getFavorites,
  cancelOrder,
  getSavedAddresses,
  addSavedAddress,
  deleteSavedAddress,
  getOrderReceipt
};
