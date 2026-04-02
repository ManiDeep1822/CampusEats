const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

const testCleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testOrderId = 'TC-' + Math.floor(Math.random() * 1000000);
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    // 1. Create a stale order bypassing Mongoose hooks to set createdAt manually
    const staleOrderObj = {
      orderId: testOrderId,
      studentId: new mongoose.Types.ObjectId('69c443a7246d28764b339d4e'),
      vendorId: new mongoose.Types.ObjectId('69c443a7246d28764b339d56'),
      items: [{
        menuItemId: new mongoose.Types.ObjectId('69c443a8246d28764b339d68'),
        quantity: 1,
        price: 150
      }],
      orderType: 'take_away',
      status: 'pending_payment',
      totalAmount: 150,
      createdAt: sixMinutesAgo,
      updatedAt: sixMinutesAgo
    };

    const staleOrder = await Order.create(staleOrderObj);
    // Explicitly update createdAt since Mongoose might have overwritten it
    await Order.findByIdAndUpdate(staleOrder._id, { createdAt: sixMinutesAgo }, { timestamps: false });

    console.log(`📦 Created stale order: ${testOrderId} (Set createdAt to: ${sixMinutesAgo.toISOString()})`);
    console.log('⏳ Waiting up to 75 seconds for the background cleanup job to trigger (interval is 60s)...');

    // Wait 70 seconds
    await new Promise(resolve => setTimeout(resolve, 70000));

    // 2. Check if cancelled
    const updatedOrder = await Order.findById(staleOrder._id);
    if (updatedOrder.status === 'cancelled') {
      console.log(`✅ SUCCESS: Order ${testOrderId} has been automatically CANCELLED.`);
    } else {
      console.log(`❌ FAILURE: Order ${testOrderId} is still ${updatedOrder.status}.`);
    }

    // 3. Cleanup test data
    await Order.findByIdAndDelete(staleOrder._id);
    console.log('🧹 Cleaned up test order.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
};

testCleanup();
