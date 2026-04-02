const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a coupon code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Please provide a discount type']
  },
  discountValue: {
    type: Number,
    required: [true, 'Please provide a discount value']
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscountAmount: {
    type: Number, // Only relevant for 'percentage' type
    default: null
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please provide an expiry date']
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Middleware to check if coupon is expired or used up
couponSchema.methods.isValid = function(orderAmount) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'This coupon is inactive.' };
  if (this.expiryDate < now) return { valid: false, message: 'This coupon has expired.' };
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }
  if (orderAmount < this.minOrderAmount) {
    return { valid: false, message: `Minimum order amount of ₹${this.minOrderAmount} required.` };
  }
  return { valid: true };
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
