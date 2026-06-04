const path = require('path');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();

// 1. Storage Configuration
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, path.join(path.resolve(), 'uploads/')); 
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`);
    }
});

// 2. Validate File Type (Images Only)
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/; // Added webp as it's great for e-commerce
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

// 3. Initialize Multer
const upload = multer({
    storage,
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// 4. The Route
// 👇 Changed to upload.array() and 'images' (plural) with a max of 6 files
router.post('/', upload.array('images', 6), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send({ message: 'No images uploaded' });
    }

    // Map through the uploaded files to construct the array of clean paths
    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);
    
    // Send back the array of paths so the frontend can save them in the Product DB
    res.status(200).send(imagePaths);
});

module.exports = router;
