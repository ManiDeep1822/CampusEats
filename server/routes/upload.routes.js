const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect } = require('../middleware/auth.middleware');

// We use the protect middleware to ensure only logged-in users (like vendors) can upload
router.post('/', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  
  // Return the public URL from Cloudinary
  res.json({
    message: 'Image uploaded successfully',
    imageUrl: req.file.path
  });
});

module.exports = router;
