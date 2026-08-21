const multer = require('multer');
const gpsService = require('./gps.service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function formatDateStamp(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getFiltersFromQuery(query) {
  return {
    month: query.month || undefined,
    salesName: query.salesName || undefined,
    customer: query.customer || undefined,
    modelId: query.modelId || undefined,
    subModelId: query.subModelId || undefined,
    salesArea: query.salesArea || undefined,
  };
}

async function uploadTransactions(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });
    const history = await gpsService.processUpload(req.file, req.user.sub);
    res.json({
      uploadId: history.id,
      version: history.version,
      totalRecords: history.totalRecords,
      successCount: history.successCount,
      failedCount: history.failedCount,
      isActiveVersion: history.isActiveVersion,
    });
  } catch (err) {
    next(err);
  }
}

async function listUploads(req, res, next) {
  try {
    res.json({ uploads: await gpsService.listUploads() });
  } catch (err) {
    next(err);
  }
}

async function rollback(req, res, next) {
  try {
    const target = await gpsService.rollbackToVersion(Number(req.params.id));
    res.json({ message: `Rollback ke versi ${target.version} berhasil`, uploadId: target.id });
  } catch (err) {
    next(err);
  }
}

async function deleteUpload(req, res, next) {
  try {
    await gpsService.deleteUploadVersion(Number(req.params.id));
    res.json({ message: 'Versi upload dihapus' });
  } catch (err) {
    next(err);
  }
}

async function downloadErrorLog(req, res, next) {
  try {
    const id = Number(req.params.id);
    const workbook = await gpsService.getErrorLogWorkbook(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GPS_Error_Log_Upload_${id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function getModels(req, res, next) {
  try {
    res.json({ models: await gpsService.getModels() });
  } catch (err) {
    next(err);
  }
}

async function createSubModel(req, res, next) {
  try {
    const modelId = Number(req.params.modelId);
    const { name, targetGpPercent } = req.body;
    if (!name || targetGpPercent === undefined) {
      return res.status(400).json({ message: 'name dan targetGpPercent wajib diisi' });
    }
    const subModel = await gpsService.createSubModel(modelId, { name, targetGpPercent });
    res.status(201).json({ subModel });
  } catch (err) {
    next(err);
  }
}

async function updateSubModel(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, targetGpPercent, isActive } = req.body;
    const subModel = await gpsService.updateSubModel(id, { name, targetGpPercent, isActive });
    res.json({ subModel });
  } catch (err) {
    next(err);
  }
}

async function getUnclassifiedMaterials(req, res, next) {
  try {
    res.json({ materials: await gpsService.getUnclassifiedMaterials() });
  } catch (err) {
    next(err);
  }
}

async function assignMaterialSubModel(req, res, next) {
  try {
    const { materialNo, subModelId } = req.body;
    if (!materialNo || !subModelId) {
      return res.status(400).json({ message: 'materialNo dan subModelId wajib diisi' });
    }
    const result = await gpsService.assignMaterialSubModel(materialNo, Number(subModelId), req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getFilterOptions(req, res, next) {
  try {
    res.json(await gpsService.getFilterOptions());
  } catch (err) {
    next(err);
  }
}

async function getDashboardSummary(req, res, next) {
  try {
    res.json({ summary: await gpsService.getDashboardSummary(getFiltersFromQuery(req.query)) });
  } catch (err) {
    next(err);
  }
}

async function getDashboardRanking(req, res, next) {
  try {
    res.json({ ranking: await gpsService.getDashboardRanking(getFiltersFromQuery(req.query)) });
  } catch (err) {
    next(err);
  }
}

async function getDashboardKpi(req, res, next) {
  try {
    res.json(await gpsService.getDashboardKpi(getFiltersFromQuery(req.query)));
  } catch (err) {
    next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const transactions = await gpsService.getTransactions(getFiltersFromQuery(req.query), req.query.search);
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

async function exportTransactions(req, res, next) {
  try {
    const transactions = await gpsService.getTransactions(getFiltersFromQuery(req.query), req.query.search);
    const workbook = await gpsService.buildTransactionExportWorkbook(transactions);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GPS_Detail_Transaction_${formatDateStamp(new Date())}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function exportRanking(req, res, next) {
  try {
    const ranking = await gpsService.getDashboardRanking(getFiltersFromQuery(req.query));
    const workbook = await gpsService.buildRankingExportWorkbook(ranking);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GPS_Sales_Ranking_${formatDateStamp(new Date())}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  uploadTransactions,
  listUploads,
  rollback,
  deleteUpload,
  downloadErrorLog,
  getModels,
  createSubModel,
  updateSubModel,
  getUnclassifiedMaterials,
  assignMaterialSubModel,
  getFilterOptions,
  getDashboardSummary,
  getDashboardRanking,
  getDashboardKpi,
  getTransactions,
  exportTransactions,
  exportRanking,
};
