const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');

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
  const vendors = await Vendor.find({}).populate('userId', 'name email phone profilePic');
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
  const deliveryBoys = await DeliveryBoy.find({}).populate('userId', 'name email phone profilePic');
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
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password, role: role || 'student', phone });

  if (user) {
    if (user.role === 'vendor') {
      await Vendor.create({ userId: user._id, shopName: shopName || `${name}'s Shop`, location: location || 'Campus', cuisineType: [] });
    } else if (user.role === 'delivery') {
      await DeliveryBoy.create({ userId: user._id, vehicleType: vehicleType || 'Bicycle' });
    }
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
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
  createUser
};
