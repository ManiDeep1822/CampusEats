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
    required: true
  },
  phone: { type: String },
  profilePic: { type: String },
  address: { type: String },
  isVerified: { type: Boolean, default: false },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  pushSubscription: { type: Object }
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  console.log(`🔐 [Model] Hashing password for: ${this.email}...`);
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  console.log(`🔐 [Model] Password hashed successfully.`);
});

// Method to verify password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
