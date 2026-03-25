const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');

const submitFeedback = asyncHandler(async (req, res) => {
  const { name, email, role, category, message, rating } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error('Please fill in all required fields (Name, Email, Message)');
  }

  const feedback = new Feedback({
    name,
    email,
    role: role || 'guest',
    category,
    message,
    rating
  });

  await feedback.save();
  
  res.status(201).json({ message: 'Feedback submitted successfully. Thank you for reaching out!' });
});

// Admin Route
const getFeedback = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find().sort({ createdAt: -1 });
  res.json(feedbacks);
});

module.exports = { submitFeedback, getFeedback };
