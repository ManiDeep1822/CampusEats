const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
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

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, address, otp, ...extra } = req.body;

  // 1. Basic Field Validation
  if (!name || !email || !password || !phone) {
    res.status(400); throw new Error('Please provide all required fields (name, email, password, phone)');
  }

  // 2. Email Validation (Regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400); throw new Error('Invalid email format');
  }

  // 3. Phone Number Validation (10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    res.status(400); throw new Error('Invalid phone number. Must be a 10-digit number.');
  }

  // 4. Password Strength Validation
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    res.status(400); throw new Error('Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
  }

  // 5. Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400); throw new Error('User with this email already exists');
  }

  // 5.5 Verify OTP (Required for registration)
  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400); throw new Error('Invalid verification code.');
  }

  // M2: Check for 5-minute expiration
  const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
  if (otpAge > 5 * 60 * 1000) {
    await OTP.deleteOne({ email });
    res.status(400); throw new Error('Verification code has expired. Please request a new one.');
  }

  // 6. Security Patch: Prevent Privilege Escalation
  let assignedRole = role || 'student';
  if (assignedRole === 'admin') {
    res.status(403); throw new Error('Unauthorized role assignment: Cannot self-register as an administrator.');
  }

  // 7. Create User
  const user = await User.create({ 
    name, 
    email, 
    password, 
    role: assignedRole, 
    phone, 
    address,
    isVerified: true
  });

  // 7.5 Delete used OTP
  await OTP.deleteOne({ email });


  if (user) {
    // 8. Create secondary profiles based on role
    if (assignedRole === 'vendor') {
      await Vendor.create({ 
        userId: user._id, 
        shopName: extra.shopName || `${name}'s Shop`, 
        location: extra.location || 'Campus', 
        cuisineType: extra.cuisineType || [] 
      });
    } else if (assignedRole === 'delivery') {
      await DeliveryBoy.create({ 
        userId: user._id, 
        vehicleType: extra.vehicleType || 'Bicycle' 
      });
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const token = generateToken(user._id, user.tokenVersion);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      provider: user.provider || 'local',
      token: token,
    });
  } else {
    res.status(400); throw new Error('Invalid user data');
  }
});

const verifyAccount = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400); throw new Error('Email and OTP are required');
  }

  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400); throw new Error('Invalid verification code');
  }

  // M2: Check for 5-minute expiration
  const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
  if (otpAge > 5 * 60 * 1000) {
    await OTP.deleteOne({ email });
    res.status(400); throw new Error('Verification code has expired');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404); throw new Error('User not found');
  }

  user.isVerified = true;
  await user.save();
  await OTP.deleteOne({ email });

  res.status(200).json({ message: 'Account verified successfully' });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Single device logic: Increment tokenVersion to invalidate existing tokens
    const oldTokenVersion = user.tokenVersion || 0;
    user.tokenVersion = oldTokenVersion + 1;
    await user.save();

    // PROACTIVE NOTIFICATION: Notify existing sessions to show the "Logged in elsewhere" popup
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`${user.role}:${user._id}`).emit('session-invalidated', { 
          message: 'You have logged in from another device.',
          timestamp: Date.now()
        });
      }
    } catch (socketErr) {
      console.warn('Non-critical: Failed to emit session-invalidation socket event:', socketErr.message);
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      provider: user.provider || 'local',
      mustChangePassword: user.mustChangePassword,
      token: generateToken(user._id, user.tokenVersion),
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

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Authenticate user with Google ID Token
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    res.status(400);
    throw new Error('Google ID token (credential) is required');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update profile picture and name if they've changed
      user.name = name || user.name;
      user.profilePic = picture || user.profilePic;
      user.provider = 'google'; // Explicitly set provider
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        provider: 'google',
        token: generateToken(user._id, user.tokenVersion),
      });
    } else {
      // Create new user (default role: student)
      // M5: Use cryptographically secure random bytes for temporary password
      const generatedPassword = crypto.randomBytes(12).toString('hex') + 'A1!'; 
      
      user = await User.create({
        name,
        email,
        password: generatedPassword, 
        profilePic: picture,
        isVerified: true,
        role: 'student'
      });

      if (user) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.provider = 'google'; // Explicitly set provider
        await user.save();
        
        res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePic: user.profilePic,
          provider: 'google',
          token: generateToken(user._id, user.tokenVersion),
        });
      } else {
        res.status(400);
        throw new Error('Failed to create user with Google data');
      }
    }
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(401);
    throw new Error('Invalid Google Token or authentication failed', { cause: error });
  }
});


// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400); throw new Error('Please provide current and new passwords');
  }

  const user = await User.findById(req.user._id);

  if (user && (await user.matchPassword(currentPassword))) {
    // Validate strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400); throw new Error('New password must meet strength requirements (8+ chars, uppercase, lowercase, number, special char)');
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } else {
    res.status(401);
    throw new Error('Invalid current password');
  }
});


// @desc    Send password reset OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400); throw new Error('Email is required'); }

  const user = await User.findOne({ email });
  if (!user) {
    // Respond with 200 to not leak whether an email exists (security best practice)
    return res.status(200).json({ message: 'If an account exists with that email, a reset code has been sent.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  await OTP.findOneAndUpdate(
    { email },
    { otp: otpCode, createdAt: Date.now() },
    { upsert: true, returnDocument: 'after' }
  );

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800;">CampusEats</h1>
        <p style="color: #ffedd5; font-size: 16px; margin-top: 8px;">Password Reset Request</p>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 20px;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          We received a request to reset the password for your CampusEats account. Use the secure code below:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 auto; max-width: 300px;">
          <h1 style="margin: 0; font-size: 42px; font-weight: 700; color: #f97316; letter-spacing: 8px;">${otpCode}</h1>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 30px; font-weight: 500;">
          ⏳ This code expires in <strong>5 minutes</strong>. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  await sendEmail({ email, subject: 'CampusEats — Password Reset Code', message: `Your password reset code is: ${otpCode}`, html });
  res.status(200).json({ message: 'If an account exists with that email, a reset code has been sent.' });
});

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400); throw new Error('Email, OTP, and new password are required');
  }

  // 1. Find and verify OTP
  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400); throw new Error('Invalid verification code.');
  }

  // M2: Check for 5-minute expiration
  const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
  if (otpAge > 5 * 60 * 1000) {
    await OTP.deleteOne({ email });
    res.status(400); throw new Error('Reset code has expired. Please request a new one.');
  }

  // 2. Validate new password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    res.status(400); throw new Error('Password must be 8+ chars with uppercase, lowercase, number, and special character.');
  }

  // 3. Update user password
  const user = await User.findOne({ email });
  if (!user) { res.status(404); throw new Error('User not found'); }

  user.password = newPassword;
  await user.save();

  // 4. Delete used OTP
  await OTP.deleteOne({ email });

  res.json({ message: 'Password reset successfully! You can now login with your new password.' });
});

// @desc    Update User Profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.dietaryPreference = req.body.dietaryPreference || user.dietaryPreference;
    user.allergies = req.body.allergies || user.allergies;
    if (req.body.profilePic !== undefined) {
      user.profilePic = req.body.profilePic;
    }
    
    if (req.body.notificationSettings) {
      user.notificationSettings = {
        ...user.notificationSettings,
        ...req.body.notificationSettings
      };
    }

    if (req.body.pushSubscription) {
      user.pushSubscription = req.body.pushSubscription;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profilePic: updatedUser.profilePic,
      role: updatedUser.role,
      dietaryPreference: updatedUser.dietaryPreference,
      allergies: updatedUser.allergies,
      notificationSettings: updatedUser.notificationSettings,
      savedAddresses: updatedUser.savedAddresses,
      provider: updatedUser.provider
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Add Saved Address
// @route   POST /api/auth/profile/address
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const { tag, address, isDefault } = req.body;
  const user = await User.findById(req.user._id);

  if (user) {
    if (isDefault) {
      user.savedAddresses.forEach(a => a.isDefault = false);
    }
    user.savedAddresses.push({ tag, address, isDefault });
    await user.save();
    res.status(201).json(user.savedAddresses);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Remove Saved Address
// @route   DELETE /api/auth/profile/address/:id
// @access  Private
const removeAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.id);
    await user.save();
    res.json(user.savedAddresses);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Set Default Address
// @route   PUT /api/auth/profile/address/:id/default
// @access  Private
const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.savedAddresses.forEach(a => {
      a.isDefault = a._id.toString() === req.params.id;
    });
    await user.save();
    res.json(user.savedAddresses);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Complete initial password setup (mandatory change)
// @route   POST /api/auth/complete-setup
// @access  Private
const completeInitialPasswordSetup = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (user) {
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    
    res.json({ message: 'Password updated successfully. Account fully activated.' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Save push notification subscription
// @route   POST /api/auth/push/subscribe
// @access  Private
const subscribeToPush = asyncHandler(async (req, res) => {
  const subscription = req.body;
  const user = await User.findById(req.user._id);
  if (user) {
    user.pushSubscription = subscription;
    // Also ensure push is enabled in settings when they subscribe
    user.notificationSettings.push = true;
    await user.save();
    res.status(201).json({ message: 'Push subscription saved' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  registerUser,
  loginUser,
  getMe, 
  refreshToken, 
  logoutUser, 
  changePassword, 
  sendOTP, 
  googleAuth, 
  forgotPassword, 
  resetPasswordWithOTP, 
  verifyAccount,
  updateProfile,
  addAddress,
  removeAddress,
  setDefaultAddress,
  completeInitialPasswordSetup,
  subscribeToPush
};
