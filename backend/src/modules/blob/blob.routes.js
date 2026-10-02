const express = require('express');
const controller = require('./blob.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/client-upload', controller.clientUpload);

module.exports = router;
