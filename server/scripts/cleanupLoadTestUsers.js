require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');

async function cleanup() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    // Criteria: 
    // 1. Name matches "Load Test User" (Case-insensitive)
    // 2. Email starts with "test-"
    const criteria = {
      $or: [
        { name: { $regex: /^Load Test User$/i } },
        { email: { $regex: /^test-/i } }
      ]
    };

    const usersToDelete = await User.find(criteria);
    
    if (usersToDelete.length === 0) {
      console.log('ℹ️ No load test users found in the database.');
      process.exit(0);
    }

    console.log(`🔍 Found ${usersToDelete.length} users to delete.`);

    for (const user of usersToDelete) {
      console.log(`\n--- Deleting User: ${user.email} (${user.name}) ---`);

      // 1. Delete associated Vendor profile
      if (user.role === 'vendor') {
        const vendor = await Vendor.findOneAndDelete({ userId: user._id });
        if (vendor) console.log(`  - Deleted Vendor profile: ${vendor.shopName}`);
      }

      // 2. Delete associated Delivery profile
      if (user.role === 'delivery') {
        const delivery = await DeliveryBoy.findOneAndDelete({ userId: user._id });
        if (delivery) console.log(`  - Deleted Delivery profile: ${delivery.vehicleType}`);
      }

      // 3. Delete associated Orders (placed by the user)
      const deletedOrders = await Order.deleteMany({ studentId: user._id });
      if (deletedOrders.deletedCount > 0) {
        console.log(`  - Deleted ${deletedOrders.deletedCount} orders placed by this user.`);
      }

      // 4. Delete the User record
      await User.findByIdAndDelete(user._id);
      console.log(`  - Deleted User record successfully.`);
    }

    console.log(`\n✅ Cleanup complete. ${usersToDelete.length} users removed.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanup();
