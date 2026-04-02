const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Coupon = require('../models/Coupon');

const seedCoupons = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const coupons = [
      // ── Displayed on StudentHome "Top Offers For You" ──────────────────
      {
        code: 'CAMPUS100',
        discountType: 'fixed',
        discountValue: 100,
        minOrderAmount: 499,
        maxDiscountAmount: null,
        expiryDate: new Date('2026-12-31'),
        usageLimit: 2000,
        isActive: true
      },
      {
        code: 'WELCOME50',
        discountType: 'percentage',
        discountValue: 50,
        minOrderAmount: 0,
        maxDiscountAmount: 80,   // Cap: up to ₹80
        expiryDate: new Date('2026-12-31'),
        usageLimit: 5000,
        isActive: true
      },
      {
        code: 'FREESHIP',
        discountType: 'fixed',
        discountValue: 40,       // Covers standard delivery fee
        minOrderAmount: 0,
        maxDiscountAmount: null,
        expiryDate: new Date('2026-12-31'),
        usageLimit: null,        // Unlimited
        isActive: true
      },
      {
        code: 'BOGO',
        discountType: 'percentage',
        discountValue: 50,
        minOrderAmount: 150,
        maxDiscountAmount: 200,  // Cap: up to ₹200
        expiryDate: new Date('2026-12-31'),
        usageLimit: 1000,
        isActive: true
      },
      // ── Legacy codes (kept for backward compatibility) ──────────────────
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
        maxDiscountAmount: null,
        expiryDate: new Date('2026-12-31'),
        usageLimit: 500,
        isActive: true
      }
    ];

    for (const c of coupons) {
      await Coupon.findOneAndUpdate(
        { code: c.code },
        c,
        { upsert: true, new: true, setDefaultsOnInsert: true }  // Fixed: was 'upsrert'
      );
      console.log(`✅ Synced coupon: ${c.code}`);
    }

    console.log('\n🎉 All coupons seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedCoupons();
