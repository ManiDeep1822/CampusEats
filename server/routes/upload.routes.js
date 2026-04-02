const express = require('express');
const router = express.Router();
const { cloudinary, upload } = require('../config/cloudinary');

const { protect } = require('../middleware/auth.middleware');

// Manual upload using memory storage and Cloudinary stream
router.post('/', protect, (req, res) => {
  // M10: Extra safety for Express 5 — ensure body/query are writable before Multer tries to assign to them
  ['body', 'query'].forEach(prop => {
    if (Object.getOwnPropertyDescriptor(req, prop)?.get) {
      const val = req[prop];
      Object.defineProperty(req, prop, { value: val, writable: true, configurable: true });
    }
  });

  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer/Upload Error:', err);
      const statusCode = err.name === 'MulterError' ? 400 : 500;
      return res.status(statusCode).json({ 
        message: err.name === 'MulterError' ? `Upload error: ${err.message}` : 'Server error during upload process', 
        error: err.message
      });
    }

    if (!req.file) {
      console.warn('⚠️ Upload attempt with no file in request');
      return res.status(400).json({ message: 'No image uploaded' });
    }

    try {
      // Create a stream to upload to Cloudinary
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'campuseats/menu_items',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Upload Error:', error);
            return res.status(500).json({ message: 'Cloudinary upload failed', error: error.message });
          }
          
          console.log('✅ Image uploaded manually:', result.secure_url);
          res.json({
            message: 'Image uploaded successfully',
            imageUrl: result.secure_url
          });
        }
      );

      // Write the file buffer to the stream
      stream.end(req.file.buffer);
    } catch (uploadError) {
      console.error('❌ Stream Error:', uploadError);
      res.status(500).json({ message: 'Upload stream failed', error: uploadError.message });
    }
  });
});



module.exports = router;
