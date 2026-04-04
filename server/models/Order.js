const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', index: true },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  orderType: { 
    type: String, 
    enum: ['delivery', 'take_away'], 
    default: 'delivery',
    required: true
  },
  status: {
    type: String,
    enum: ['pending_payment', 'placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending_payment',
    required: true,
    index: true
  },
  deliveryAddress: { type: String, required: function() { return this.orderType === 'delivery'; } },
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  estimatedTime: { type: Number }, // in minutes
  placedAt: { type: Date, default: Date.now, index: true },
  scheduledFor: { type: Date }, // Feature: Scheduled Deliveries
  estimatedDeliveryTime: { type: Date }, // Feature: Smart ETAs
  deliveredAt: { type: Date },
  specialInstructions: { type: String },
  deliveryOtp: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  cancellationReason: { type: String },
  arrivedAtVendorAt: { type: Date },
  pickedUpAt: { type: Date },
  chatHistory: [{
    sender: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  couponCode: { type: String },
  discountAmount: { type: Number, default: 0 },
  
  // SECURE FINANCIAL AUDIT FIELDS (Option 1: Internal Ledger)
  vendorEarnings: { type: Number, default: 0 },
  deliveryEarnings: { type: Number, default: 0 },
  adminEarnings: { type: Number, default: 0 },
  isCommissionSplit: { type: Boolean, default: false, index: true }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
