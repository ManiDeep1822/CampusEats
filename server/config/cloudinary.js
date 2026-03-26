const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const multer = require('multer');



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// In version 2.x, the export is a direct factory function, not a class.
// We use the simpler syntax compatible with this project's version.
const storage = multerStorageCloudinary({
  cloudinary: cloudinary,
  folder: 'campuseats/menu_items',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
});




const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload
};
