const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect } = require('../middleware/auth.middleware');

// We use the protect middleware to ensure only logged-in users (like vendors) can upload
router.post('/', protect, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer/Cloudinary Upload Error:', err);
      return res.status(500).json({ 
        message: 'Upload failed', 
        error: err.message 
      });
    }

    if (!req.file) {
      console.warn('⚠️ No image file provided in request');
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    console.log('✅ Image uploaded successfully:', req.file.path);
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: req.file.path
    });
  });
});


module.exports = router;
