const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['student', 'vendor', 'delivery', 'guest'], default: 'guest' },
  category: { type: String, default: 'General Inquiry' },
  message: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  resolved: { type: Boolean, default: false }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
