const mongoose = require('mongoose');

const deliveryBoySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleType: { type: String },
  isAvailable: { type: Boolean, default: false },
  currentLocation: { type: String },
  totalDeliveries: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  paymentDetails: {
    upiId: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String }
  },
  rating: { type: Number, default: 0 },
  activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);
module.exports = DeliveryBoy;
