const express = require('express');
const controller = require('./gps.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');
const { requireFeatureEnabled } = require('../../middleware/featureFlag');

const router = express.Router();

router.use(requireAuth);

// Dashboard (semua role login)
router.get('/filters', controller.getFilterOptions);
router.get('/dashboard/summary', controller.getDashboardSummary);
router.get('/dashboard/ranking', controller.getDashboardRanking);
router.get('/dashboard/kpi', controller.getDashboardKpi);
router.get('/transactions', controller.getTransactions);
router.get('/transactions/export', requireFeatureEnabled('gps_export'), controller.exportTransactions);
router.get('/dashboard/ranking/export', requireFeatureEnabled('gps_export'), controller.exportRanking);
router.get('/models', controller.getModels);

// Admin only
router.post('/uploads', requireRole('admin'), controller.upload.single('file'), controller.uploadTransactions);
router.get('/uploads', requireRole('admin'), controller.listUploads);
router.post('/uploads/:id/rollback', requireRole('admin'), controller.rollback);
router.delete('/uploads/:id', requireRole('admin'), controller.deleteUpload);
router.get('/uploads/:id/error-log', requireRole('admin'), controller.downloadErrorLog);

router.post('/models/:modelId/sub-models', requireRole('admin'), controller.createSubModel);
router.patch('/sub-models/:id', requireRole('admin'), controller.updateSubModel);

router.get('/unclassified-materials', requireRole('admin'), controller.getUnclassifiedMaterials);
router.post('/material-map', requireRole('admin'), controller.assignMaterialSubModel);

module.exports = router;
