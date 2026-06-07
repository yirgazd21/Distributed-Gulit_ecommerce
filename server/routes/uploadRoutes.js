const express = require('express');
const { uploadProductImages } = require('../middleware/uploadMiddleware');
const { uploadBuffer, isConfigured } = require('../utils/cloudinary');

const router = express.Router();

router.post('/', uploadProductImages, async (req, res) => {
  try {
    if (!isConfigured) {
      return res.status(500).send({ message: 'Cloudinary is not configured' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ message: 'No images uploaded' });
    }

    const uploads = await Promise.all(
      req.files.map((file, index) =>
        uploadBuffer({
          buffer: file.buffer,
          folder: 'gulit/products',
          resourceType: 'auto',
          publicId: `${file.fieldname}-${Date.now()}-${index}`,
        })
      )
    );

    const imageUrls = uploads.map((result) => result.secure_url);
    res.status(200).send(imageUrls);
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).send({ message: error.message || 'Image upload failed' });
  }
});

module.exports = router;
