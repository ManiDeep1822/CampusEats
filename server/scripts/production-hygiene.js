const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const OTP = require('../models/OTP');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for production cleanup...');

    // 1. Restore "Chai Chacha" Approval (isApproved: true)
    const restoreResult = await Vendor.updateOne(
      { shopName: /chai chacha/i },
      { $set: { isApproved: true } }
    );
    console.log(`✅ Restored Chai Chacha: ${restoreResult.modifiedCount} updated.`);

    // 2. Identify Students to delete from User collection
    const userDeleteResult = await User.deleteMany({ 
      role: { $in: ['student', 'user'] } 
    });
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} student/user accounts.`);

    // 3. Clear Transactional & Temporary Data
    const collectionsToClear = [
      { model: Order, name: 'Orders' },
      { model: Payment, name: 'Payments' },
      { model: OTP, name: 'OTPs' },
      { model: Notification, name: 'Notifications' },
      { model: Feedback, name: 'Feedback entries' }
    ];

    for (const item of collectionsToClear) {
      const res = await item.model.deleteMany({});
      console.log(`✅ Cleared ${res.deletedCount} ${item.name}.`);
    }

    console.log('\n--- Production Cleanup Complete ---');
    console.log('Preserved: Vendors, Riders, Admins, and Menu Items.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

cleanup();
