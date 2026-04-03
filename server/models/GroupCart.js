const mongoose = require('mongoose');

const groupCartSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  joinCode: { type: String, required: true, unique: true, index: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String }, // For easier UI display
    items: [{
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
      name: { type: String },
      price: { type: Number },
      quantity: { type: Number, default: 1 }
    }],
    isReady: { type: Boolean, default: false } // Sub-user is done adding items
  }],
  status: { type: String, enum: ['active', 'locked', 'converted'], default: 'active' },
  totalAmount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) } // 2 hours expiry
}, { timestamps: true });

// Pre-save validation for members limit (Max 5)
groupCartSchema.pre('save', function() {
  if (this.members.length > 5) {
    throw new Error('Group size cannot exceed 5 members.');
  }
});

const GroupCart = mongoose.model('GroupCart', groupCartSchema);
module.exports = GroupCart;
