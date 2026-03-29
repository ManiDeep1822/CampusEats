const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DUMMY_SUFFIX = '@campuseats.dummy';

const removeData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for cleanup...');

    // 1. Find all dummy users
    const dummyUsers = await User.find({ email: { $regex: DUMMY_SUFFIX } });
    const dummyUserIds = dummyUsers.map(u => u._id);

    if (dummyUserIds.length === 0) {
      console.log('No dummy data found to remove.');
      process.exit(0);
    }

    // 2. Find associated vendors
    const dummyVendors = await Vendor.find({ userId: { $in: dummyUserIds } });
    const dummyVendorIds = dummyVendors.map(v => v._id);

    // 3. Delete everything
    console.log(`Deleting ${dummyUserIds.length} users, ${dummyVendorIds.length} vendors, and their menu items...`);
    
    await MenuItem.deleteMany({ vendorId: { $in: dummyVendorIds } });
    await Vendor.deleteMany({ _id: { $in: dummyVendorIds } });
    await User.deleteMany({ _id: { $in: dummyUserIds } });

    console.log('\n✅ Cleanup complete! All dummy stalls have been removed.');
    process.exit(0);
  } catch (error) {
    console.error('Error removing dummy data:', error);
    process.exit(1);
  }
};

removeData();
