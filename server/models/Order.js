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
  status: {
    type: String,
    enum: ['pending_payment', 'placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending_payment',
    required: true
  },
  deliveryAddress: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  estimatedTime: { type: Number }, // in minutes
  placedAt: { type: Date, default: Date.now },
  scheduledFor: { type: Date }, // Feature: Scheduled Deliveries
  estimatedDeliveryTime: { type: Date }, // Feature: Smart ETAs
  deliveredAt: { type: Date },
  specialInstructions: { type: String },
  deliveryOtp: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  chatHistory: [{
    sender: { type: String, enum: ['Student', 'Rider'] },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
