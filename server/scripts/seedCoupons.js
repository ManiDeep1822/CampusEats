const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Coupon = require('../models/Coupon');

const seedCoupons = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const coupons = [
      {
        code: 'CAMPUS50',
        discountType: 'percentage',
        discountValue: 50,
        minOrderAmount: 200,
        maxDiscountAmount: 100,
        expiryDate: new Date('2026-12-31'),
        usageLimit: 1000,
        isActive: true
      },
      {
        code: 'OFFER100',
        discountType: 'fixed',
        discountValue: 100,
        minOrderAmount: 500,
        expiryDate: new Date('2026-12-31'),
        usageLimit: 500,
        isActive: true
      }
    ];

    for (const c of coupons) {
        await Coupon.findOneAndUpdate({ code: c.code }, c, { upsrert: true, new: true, setDefaultsOnInsert: true });
        console.log(`Synced coupon: ${c.code}`);
    }

    console.log('Seed successful');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedCoupons();
