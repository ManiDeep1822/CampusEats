const multerStorageCloudinary = require('multer-storage-cloudinary');
console.log('--- Multer Storage Cloudinary Export ---');
console.log('Type:', typeof multerStorageCloudinary);
console.log('Keys:', Object.keys(multerStorageCloudinary));
if (multerStorageCloudinary.CloudinaryStorage) {
  console.log('CloudinaryStorage Type:', typeof multerStorageCloudinary.CloudinaryStorage);
}
console.log('Full structure:', multerStorageCloudinary);
