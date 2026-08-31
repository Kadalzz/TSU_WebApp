const express = require('express');
const controller = require('./machine.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');
const { requireFeatureEnabled } = require('../../middleware/featureFlag');
const { requireModuleAccess } = require('../../middleware/moduleAccess');

const router = express.Router();

router.use(requireAuth);
router.use(requireModuleAccess('pricing'));

router.post('/search', controller.search);
router.post('/export', requireFeatureEnabled('pricing_export'), controller.exportResults);

router.get('/uploads', requireRole('admin'), controller.listUploads);
router.post('/uploads', requireRole('admin'), controller.upload.single('file'), controller.uploadMaster);
router.post('/uploads/:id/rollback', requireRole('admin'), controller.rollback);
router.delete('/uploads/:id', requireRole('admin'), controller.deleteUpload);
router.get('/uploads/:id/error-log', requireRole('admin'), controller.downloadErrorLog);

module.exports = router;
