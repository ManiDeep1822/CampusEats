const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const OTP = require('../models/OTP');
const Coupon = require('../models/Coupon');
const sendEmail = require('../utils/sendEmail');

const crypto = require('crypto');

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
    const allowedRoles = ['student', 'vendor', 'delivery', 'admin'];
    if (role && !allowedRoles.includes(role)) {
      res.status(400); throw new Error('Invalid role specified');
    }
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
  const lifetimeCommission = allDeliveredOrders.reduce((acc, curr) => acc + (curr.adminEarnings || 0), 0);

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
  const { name, email, role, phone, shopName, location, vehicleType, upiId } = req.body;
  let { password } = req.body;

  // M5: Generate a secure random temporary password if not provided
  if (!password) {
    password = crypto.randomBytes(10).toString('hex') + '!'; 
  }

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
    user.mustChangePassword = (user.role === 'vendor' || user.role === 'delivery');
    await user.save();
    
    console.log(`♻️ Resuming onboarding for unverified user: ${email}`);
  } else {
    // CREATE NEW USER (Initially unverified)
    user = await User.create({ 
      name, 
      email, 
      password, 
      role: role || 'student', 
      phone, 
      isVerified: false,
      mustChangePassword: (role === 'vendor' || role === 'delivery') // Restricted to Staff
    });
  }

  if (user) {
    let profileId = null;
    if (user.role === 'vendor') {
      const vendorRecord = await Vendor.findOneAndUpdate(
        { userId: user._id },
        { 
          shopName: shopName || `${name}'s Shop`, 
          location: location || 'Campus',
          paymentDetails: upiId ? { upiId } : undefined
        },
        { upsert: true, new: true }
      );
      profileId = vendorRecord._id;
    } else if (user.role === 'delivery') {
      const deliveryRecord = await DeliveryBoy.findOneAndUpdate(
        { userId: user._id },
        { 
          vehicleType: vehicleType || 'Bicycle',
          paymentDetails: upiId ? { upiId } : undefined
        },
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

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json(coupons);
});

// @desc    Create a coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit } = req.body;

  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });

  if (couponExists) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount: discountType === 'percentage' ? maxDiscountAmount : null,
    expiryDate,
    usageLimit
  });

  if (coupon) {
    res.status(201).json(coupon);
  } else {
    res.status(400);
    throw new Error('Invalid coupon data');
  }
});

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (coupon) {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon removed' });
  } else {
    res.status(404);
    throw new Error('Coupon not found');
  }
});

// @desc    Toggle coupon status
// @route   PUT /api/admin/coupons/:id/status
// @access  Private/Admin
const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (coupon) {
    coupon.isActive = !coupon.isActive;
    const updatedCoupon = await coupon.save();
    res.json(updatedCoupon);
  } else {
    res.status(404);
    throw new Error('Coupon not found');
  }
});

// @desc    Get weekly payout calculation for vendors and riders
// @route   GET /api/admin/weekly-payouts
// @access  Private/Admin
const getWeeklyPayouts = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Fetch all vendors with pending payouts or recent activity
  const vendorPayouts = await Vendor.aggregate([
    { $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo"
    } },
    { $unwind: "$userInfo" },
    { $project: {
        name: "$userInfo.name",
        shopName: 1,
        phone: "$userInfo.phone",
        pendingPayout: 1,
        paymentDetails: 1
    } }
  ]);

  const riderPayouts = await DeliveryBoy.aggregate([
    { $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo"
    } },
    { $unwind: "$userInfo" },
    { $project: {
        name: "$userInfo.name",
        phone: "$userInfo.phone",
        vehicleType: 1,
        pendingPayout: 1,
        paymentDetails: 1
    } }
  ]);

  res.json({
    dateRange: { start: sevenDaysAgo, end: new Date() },
    vendorPayouts: vendorPayouts.filter(v => v.pendingPayout > 0),
    riderPayouts: riderPayouts.filter(r => r.pendingPayout > 0)
  });
});

// @desc    Mark a payout as settled (Paid)
// @route   POST /api/admin/settle-payout
// @access  Private/Admin
const settlePayout = asyncHandler(async (req, res) => {
  const { type, id } = req.body;

  if (type === 'vendor') {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new Error('Vendor not found');
    vendor.pendingPayout = 0;
    await vendor.save();
  } else if (type === 'rider') {
    const rider = await DeliveryBoy.findById(id);
    if (!rider) throw new Error('Rider not found');
    rider.pendingPayout = 0;
    await rider.save();
  } else {
    res.status(400);
    throw new Error('Invalid payout type');
  }

  res.json({ message: 'Payout marked as settled successfully' });
});

// @desc    Delete a vendor review
// @route   DELETE /api/admin/vendors/:vendorId/reviews/:reviewId
// @access  Private/Admin
const deleteVendorReview = asyncHandler(async (req, res) => {
  const { vendorId, reviewId } = req.params;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  // Find the review to be removed
  const reviewIndex = vendor.reviews.findIndex(r => r._id.toString() === reviewId);
  
  if (reviewIndex === -1) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Remove the review
  vendor.reviews.splice(reviewIndex, 1);
  vendor.numReviews = vendor.reviews.length;

  // Recalculate average rating
  if (vendor.numReviews === 0) {
    vendor.rating = 0;
  } else {
    const totalRating = vendor.reviews.reduce((acc, item) => item.rating + acc, 0);
    vendor.rating = Number((totalRating / vendor.numReviews).toFixed(1));
  }

  await vendor.save();
  res.json({ message: 'Review removed successfully', rating: vendor.rating, numReviews: vendor.numReviews });
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
  deleteDeliveryBoy,
  getCoupons,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getWeeklyPayouts,
  settlePayout,
  deleteVendorReview
};
