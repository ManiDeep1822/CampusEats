const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
}, { timestamps: true });

const vendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shopName: { type: String, required: true },
  shopImage: { type: String },
  cuisineType: [{ type: String }],
  location: { type: String, required: true }, // campus building/block
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  operatingHours: { type: String },
  isOpen: { type: Boolean, default: false, index: true },
  isApproved: { type: Boolean, default: false, index: true },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  reviews: [reviewSchema],
  totalOrders: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 }, // Total life-time earnings
  pendingPayout: { type: Number, default: 0 }, // Current unpaid balance
  paymentDetails: {
    upiId: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String }
  }
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', vendorSchema);
module.exports = Vendor;
