const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 1. Configure Storage Destination and Filename
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Files will be saved in the 'uploads/' directory at the root of your project
    cb(null, 'uploads/'); 
  },
  filename(req, file, cb) {
    // Format: fieldname-timestamp.extension (e.g., idCardImage-1678901234.pdf)
    cb(
      null,
      `${file.fieldname}-${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`
    );
  },
});

// 2. Validate File Types (Allow Images and PDFs)
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpg|jpeg|png|pdf/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only Images and PDFs are allowed.'));
  }
}

// 3. Initialize Multer
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// 4. Create the specific middleware for Seller Registration
// This strictly expects these exact three field names from the frontend form
const uploadSellerDocs = upload.fields([
  { name: 'idCardImage', maxCount: 1 },
  { name: 'merchantLicenseImage', maxCount: 1 },
  { name: 'taxReceiptImage', maxCount: 1 },
]);

const uploadProductImages = upload.array('images', 6);

module.exports = { uploadSellerDocs, uploadProductImages };
