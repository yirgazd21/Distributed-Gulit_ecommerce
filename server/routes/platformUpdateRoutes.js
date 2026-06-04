const express = require('express');
const router = express.Router();

const { getActivePlatformUpdates } = require('../controllers/platformUpdateController');

router.get('/updates', getActivePlatformUpdates);

module.exports = router;
