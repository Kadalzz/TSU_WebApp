const express = require('express');
const controller = require('./settings.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');

const router = express.Router();

router.use(requireAuth);

router.get('/feature-flags', controller.listFeatureFlags);
router.patch('/feature-flags/:key', requireRole('admin'), controller.updateFeatureFlag);

module.exports = router;
