const express = require('express');
const controller = require('./pricing.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');

const router = express.Router();

router.use(requireAuth);

router.get('/columns', controller.getColumns);
router.put('/columns', requireRole('admin'), controller.updateColumns);

router.post('/search', controller.search);
router.post('/export', controller.exportResults);
router.get('/kpi', controller.getKpi);

router.get('/uploads', requireRole('admin'), controller.listUploads);
router.post('/uploads', requireRole('admin'), controller.upload.single('file'), controller.uploadMaster);
router.post('/uploads/:id/rollback', requireRole('admin'), controller.rollback);
router.delete('/uploads/:id', requireRole('admin'), controller.deleteUpload);
router.get('/uploads/:id/error-log', requireRole('admin'), controller.downloadErrorLog);

module.exports = router;
