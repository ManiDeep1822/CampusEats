const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const multer = require('multer');

// Standard way to handle potential default/named export differences in versions
const CloudinaryStorage = (multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'campuseats/menu_items',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
  });
} catch (err) {
  console.error('⚠️  Cloudinary Storage initialization failed, falling back to older style:', err.message);
  // Fallback for very old versions if needed
  storage = multerStorageCloudinary({
    cloudinary: cloudinary,
    folder: 'campuseats/menu_items',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  });
}



const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload
};
