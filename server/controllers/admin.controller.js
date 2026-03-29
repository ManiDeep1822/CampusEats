const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }
    
    // Also delete associated vendor or delivery records
    if (user.role === 'vendor') {
      await Vendor.findOneAndDelete({ userId: user._id });
    } else if (user.role === 'delivery') {
      await DeliveryBoy.findOneAndDelete({ userId: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete a vendor and its user profile
// @route   DELETE /api/admin/vendors/:id
// @access  Private/Admin
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  
  if (vendor) {
    // 1. Delete associated user if found
    if (vendor.userId) {
      await User.findByIdAndDelete(vendor.userId);
    }
    // 2. Delete vendor record
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor removed successfully' });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

// @desc    Delete a delivery boy and its user profile
// @route   DELETE /api/admin/delivery/:id
// @access  Private/Admin
const deleteDeliveryBoy = asyncHandler(async (req, res) => {
  const deliveryBoy = await DeliveryBoy.findById(req.params.id);
  
  if (deliveryBoy) {
    // 1. Delete associated user if found
    if (deliveryBoy.userId) {
      await User.findByIdAndDelete(deliveryBoy.userId);
    }
    // 2. Delete delivery boy record
    await DeliveryBoy.findByIdAndDelete(req.params.id);
    res.json({ message: 'Delivery personnel removed successfully' });
  } else {
    res.status(404);
    throw new Error('Delivery personnel not found');
  }
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  const { role } = req.body;

  if (user) {
    user.role = role || user.role;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private/Admin
const getVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({}).populate('userId', 'name email phone profilePic isVerified');
  res.json(vendors);
});

// @desc    Update vendor status (e.g. approve/activate)
// @route   PUT /api/admin/vendors/:id/status
// @access  Private/Admin
const updateVendorStatus = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  const { isOpen, isApproved } = req.body;

  if (vendor) {
    if (isOpen !== undefined) vendor.isOpen = isOpen;
    if (isApproved !== undefined) vendor.isApproved = isApproved;
    
    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

// @desc    Get all delivery boys
// @route   GET /api/admin/delivery
// @access  Private/Admin
const getDeliveryBoys = asyncHandler(async (req, res) => {
  const deliveryBoys = await DeliveryBoy.find({}).populate('userId', 'name email phone profilePic isVerified');
  res.json(deliveryBoys);
});

// @desc    Update delivery boy availability/status
// @route   PUT /api/admin/delivery/:id/status
// @access  Private/Admin
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const deliveryBoy = await DeliveryBoy.findById(req.params.id);
  const { isAvailable } = req.body;

  if (deliveryBoy) {
    if (isAvailable !== undefined) deliveryBoy.isAvailable = isAvailable;

    const updatedDeliveryBoy = await deliveryBoy.save();
    res.json(updatedDeliveryBoy);
  } else {
    res.status(404);
    throw new Error('Delivery Boy not found');
  }
});

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const totalStudents = await User.countDocuments({ role: 'student' });
  const totalVendors = await Vendor.countDocuments({});
  const activeVendors = await Vendor.countDocuments({ isOpen: true });
  const totalDelivery = await DeliveryBoy.countDocuments({});
  const activeDelivery = await DeliveryBoy.countDocuments({ isAvailable: true });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const ordersList = await Order.find({ createdAt: { $gte: sevenDaysAgo } });
  
  const revenueMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    revenueMap[dayName] = { name: dayName, revenue: 0, orders: 0, dateStr: d.toDateString() };
  }

  ordersList.forEach(order => {
    const orderDate = new Date(order.createdAt).toDateString();
    for (const key in revenueMap) {
      if (revenueMap[key].dateStr === orderDate) {
        if (order.status === 'delivered') revenueMap[key].revenue += order.totalAmount;
        revenueMap[key].orders += 1;
      }
    }
  });

  const revenueData = Object.values(revenueMap);

  const allDeliveredOrders = await Order.find({ status: 'delivered' });
  const lifetimeTurnover = allDeliveredOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const lifetimeCommission = Number((lifetimeTurnover * 0.05).toFixed(2));

  res.json({
    totalUsers,
    totalStudents,
    totalVendors,
    activeVendors,
    totalDelivery,
    activeDelivery,
    revenueData,
    lifetimeTurnover,
    lifetimeCommission
  });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, shopName, location, vehicleType } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400); throw new Error('User already exists');
  }

  // Create user with isVerified: false (mandatory onboarding)
  const user = await User.create({ 
    name, email, password, role: role || 'student', phone, isVerified: false 
  });

  if (user) {
    if (user.role === 'vendor') {
      await Vendor.create({ userId: user._id, shopName: shopName || `${name}'s Shop`, location: location || 'Campus', cuisineType: [] });
    } else if (user.role === 'delivery') {
      await DeliveryBoy.create({ userId: user._id, vehicleType: vehicleType || 'Bicycle' });
    }

    // --- NEW: WELCOME OTP & EMAIL FLOW ---
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate(
      { email },
      { otp: otpCode, createdAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    const message = `Welcome to CampusEats, ${name}! Your account has been created by the administrator. Please use the following code to verify your account: ${otpCode}`;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">CampusEats</h1>
          <p style="color: #ffedd5; font-size: 16px; margin-top: 8px; font-weight: 400;">Welcome to the Team!</p>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 20px;">Activate Your Account</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello ${name}, your ${role} account has been successfully created. Use the temporary credentials below to get started:
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Email: <strong>${email}</strong></p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Password: <strong>${password}</strong></p>
          </div>
          <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">Your 6-digit verification code:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 auto; max-width: 300px;">
            <h1 style="margin: 0; font-size: 42px; font-weight: 700; color: #f97316; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 30px; font-weight: 500;">
            ⏳ Please verify within 5 minutes.
          </p>
        </div>
      </div>
    `;

    await sendEmail({ email, subject: 'Welcome to CampusEats - Verify Your Account', message, html });

    res.status(201).json({ 
      message: 'Account created. Verification code sent to the user.',
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    });
  } else {
    res.status(400); throw new Error('Invalid user data');
  }
});

module.exports = {
  getUsers,
  deleteUser,
  updateUserRole,
  getVendors,
  updateVendorStatus,
  getDeliveryBoys,
  updateDeliveryStatus,
  getDashboardStats,
  createUser,
  deleteVendor,
  deleteDeliveryBoy
};
