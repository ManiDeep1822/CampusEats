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

// @desc    Reply to Feedback
// @route   PUT /api/feedback/:id/reply
// @access  Private/Admin
const replyToFeedback = asyncHandler(async (req, res) => {
  const { adminReply } = req.body;
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  feedback.adminReply = adminReply;
  feedback.isReplied = true;
  feedback.repliedAt = Date.now();
  feedback.resolved = true; // Mark as resolved once replied

  const updatedFeedback = await feedback.save();
  res.json(updatedFeedback);
});

// @desc    Delete Feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  await feedback.deleteOne();
  res.json({ message: 'Feedback removed successfully' });
});

module.exports = { submitFeedback, getFeedback, replyToFeedback, deleteFeedback };
