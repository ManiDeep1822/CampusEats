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

  let user = await User.findOne({ email });

  if (user) {
    if (user.isVerified) {
      res.status(400); 
      throw new Error('User with this email already exists and is already verified.');
    }
    
    // IF USER EXISTS BUT IS NOT VERIFIED: Update their details and proceed to resend OTP
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.password = password || user.password; // This will trigger the pre-save hash if changed
    user.role = role || user.role;
    await user.save();
    
    console.log(`♻️ Resuming onboarding for unverified user: ${email}`);
  } else {
    // CREATE NEW USER (Initially unverified)
    user = await User.create({ 
      name, email, password, role: role || 'student', phone, isVerified: false 
    });
  }

  if (user) {
    let profileId = null;
    if (user.role === 'vendor') {
      const vendorRecord = await Vendor.findOneAndUpdate(
        { userId: user._id },
        { shopName: shopName || `${name}'s Shop`, location: location || 'Campus' },
        { upsert: true, new: true }
      );
      profileId = vendorRecord._id;
    } else if (user.role === 'delivery') {
      const deliveryRecord = await DeliveryBoy.findOneAndUpdate(
        { userId: user._id },
        { vehicleType: vehicleType || 'Bicycle' },
        { upsert: true, new: true }
      );
      profileId = deliveryRecord._id;
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
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border: 1px solid #eef2f6;">
          
          <!-- Header with Premium Gradient -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: -1.5px;">CampusEats</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 18px; margin-top: 10px; font-weight: 500;">Official Partner Invitation</p>
          </div>

          <div style="padding: 40px 35px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="background-color: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">New Registration</span>
            </div>
            
            <h2 style="color: #0f172a; font-size: 26px; font-weight: 800; margin-bottom: 20px; letter-spacing: -0.5px; text-align: center;">You're Invited, ${name}!</h2>
            <p style="color: #475569; font-size: 17px; line-height: 1.7; margin-bottom: 35px; text-align: center;">
              Your <strong>${role}</strong> profile has been provisioned by the CampusEats administrators. You are now part of our exclusive delivery and dining network.
            </p>

            <!-- Credentials Card -->
            <div style="background-color: #f1f5f9; border-radius: 20px; padding: 25px; margin-bottom: 35px; border: 1px dashed #cbd5e1;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Access Details</p>
              <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 15px;">Email: <strong style="color: #000000; font-family: monospace;">${email}</strong></p>
                <p style="margin: 0; color: #1e293b; font-size: 15px;">Temporary Password: <strong style="color: #000000; font-family: monospace;">${password}</strong></p>
              </div>
            </div>

            <p style="color: #0f172a; font-size: 16px; margin-bottom: 20px; font-weight: 700; text-align: center;">Registration Verification Code:</p>
            
            <!-- OTP Visualization -->
            <div style="background: #ffffff; border-radius: 20px; padding: 35px; text-align: center; border: 2px solid #f1f5f9; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);">
              <h1 style="margin: 0; font-size: 52px; font-weight: 900; color: #f97316; letter-spacing: 12px; text-shadow: 0 5px 15px rgba(249, 115, 22, 0.1);">${otpCode}</h1>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 25px; font-weight: 500;">
                ⏳ This code is valid for <strong>5 minutes</strong>.
              </p>
            </div>

            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6;">
                Please secure your credentials and change your password upon your first successful login. 
                If you did not expect this invitation, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({ email, subject: 'Invite: Verify Your New CampusEats Account', message, html });

    res.status(201).json({ 
      message: 'Account created. Invitation sent to the user.',
      _id: user._id, 
      profileId: profileId,
      name: user.name, 
      email: user.email, 
      role: user.role 
    });
  } else {
    res.status(400); throw new Error('Invalid user data');
  }
});

// @desc    Resend registration OTP for admin-created users
// @route   POST /api/admin/users/resend-otp
// @access  Private/Admin
const resendStaffOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400); throw new Error('Email is required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404); throw new Error('User not found');
  }

  if (user.isVerified) {
    res.status(400); throw new Error('User is already verified');
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  await OTP.findOneAndUpdate(
    { email },
    { otp: otpCode, createdAt: Date.now() },
    { upsert: true, returnDocument: 'after' }
  );

  const message = `Your new CampusEats registration verification code is: ${otpCode}`;
  const html = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border: 1px solid #eef2f6;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">CampusEats</h1>
          <p style="color: rgba(255,255,255,0.7); font-size: 16px; margin-top: 8px;">Verification Code Reset</p>
        </div>
        <div style="padding: 40px 35px; text-align: center;">
          <p style="color: #475569; font-size: 16px; margin-bottom: 30px;">
            A new verification code has been requested for your account registration.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 0 auto; max-width: 280px; text-align: center;">
            <h1 style="margin: 0; font-size: 42px; font-weight: 800; color: #f97316; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">
            This code expires in <strong>5 minutes</strong>.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({ email, subject: 'New Verification Code - CampusEats', message, html });

  res.json({ message: 'A fresh verification code has been dispatched.' });
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
  resendStaffOTP,
  deleteVendor,
  deleteDeliveryBoy
};
