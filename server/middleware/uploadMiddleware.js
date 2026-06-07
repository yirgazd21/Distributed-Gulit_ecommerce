const multer = require('multer');
const path = require('path');

// Use memory storage so uploads can be streamed to Cloudinary.
const storage = multer.memoryStorage();

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type! Only images and PDFs are allowed.'));
}

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
});

const uploadSellerDocs = upload.fields([
  { name: 'idCardImage', maxCount: 1 },
  { name: 'merchantLicenseImage', maxCount: 1 },
  { name: 'taxReceiptImage', maxCount: 1 },
]);

const uploadProductImages = upload.array('images', 6);

module.exports = { uploadSellerDocs, uploadProductImages };
