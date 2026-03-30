const cloudinary = require('cloudinary').v2;
const multer = require('multer');



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Switch to memory storage for maximum reliability across versions.
// We will upload the buffer manually in the route controller.
const storage = multer.memoryStorage();





const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload
};
