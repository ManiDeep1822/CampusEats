const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const generateToken = require('../utils/generateToken');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400); throw new Error('Email is required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400); throw new Error('Email already registered');
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.findOneAndUpdate(
    { email },
    { otp: otpCode, createdAt: Date.now() },
    { upsert: true, returnDocument: 'after' }
  );

  const message = `Your CampusEats registration verification code is: ${otpCode}. It will expire in 5 minutes.`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">CampusEats</h1>
        <p style="color: #ffedd5; font-size: 16px; margin-top: 8px; font-weight: 400;">Your Premium Campus Dining Experience</p>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 20px;">Secure Registration</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          You're almost there! To verify your email address and activate your CampusEats account, please use the secure 6-digit code below:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 auto; max-width: 300px;">
          <h1 style="margin: 0; font-size: 42px; font-weight: 700; color: #f97316; letter-spacing: 8px;">${otpCode}</h1>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 30px; font-weight: 500;">
          ⏳ This verification code will securely expire in <strong>5 minutes</strong>.
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    </div>
  `;

  await sendEmail({ email, subject: 'CampusEats Verification Code', message, html });
  res.status(200).json({ message: 'Verification code sent to email' });
});

const verifyAndRegister = asyncHandler(async (req, res) => {
  const { otp, name, email, password, role, phone, address, ...extra } = req.body;

  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord) {
    res.status(400); throw new Error('OTP Expired or Not Found. Please request a new one.');
  }
  if (otpRecord.otp !== otp) {
    res.status(400); throw new Error('Invalid Verification Code');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400); throw new Error('User already exists');
  }

  // Security Patch: Prevent Privilege Escalation
  let assignedRole = role || 'student';
  if (assignedRole === 'admin') {
     res.status(403); throw new Error('Unauthorized role assignment: Cannot self-register as an administrator.');
  }

  const user = await User.create({ name, email, password, role: assignedRole, phone, address });

  if (user) {
    await OTP.deleteOne({ email }); 

    if (assignedRole === 'vendor') {
      await Vendor.create({ userId: user._id, shopName: extra.shopName || `${name}'s Shop`, location: extra.location || 'Campus', cuisineType: extra.cuisineType || [] });
    } else if (assignedRole === 'delivery') {
      await DeliveryBoy.create({ userId: user._id, vehicleType: extra.vehicleType || 'Bicycle' });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: token,
    });
  } else {
    res.status(400); throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const refreshToken = asyncHandler(async (req, res) => {
  res.json({ message: 'Refresh token not fully implemented.' });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = { sendOTP, verifyAndRegister, loginUser, getMe, refreshToken, logoutUser };
