const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['student', 'vendor', 'delivery', 'admin'], 
    default: 'student',
    required: true,
    index: true
  },
  phone: { type: String },
  profilePic: { type: String },
  address: { type: String },
  savedAddresses: [{
    tag: { type: String, enum: ['Home', 'Hostel', 'Office', 'Other'], default: 'Other' },
    address: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }],
  isVerified: { type: Boolean, default: false },
  campusId: { type: String, sparse: true, unique: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  pushSubscription: { type: Object },
  dietaryPreference: { 
    type: String, 
    enum: ['veg', 'non-veg', 'both'], 
    default: 'both' 
  },
  allergies: [{ type: String }],
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  provider: { 
    type: String, 
    enum: ['local', 'google'], 
    default: 'local' 
  },
  tokenVersion: { type: Number, default: 0 },
  mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
