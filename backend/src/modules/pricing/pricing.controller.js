const multer = require('multer');
const pricingService = require('./pricing.service');
const { parseMaterialNumberList } = require('./pricing.upload.service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function formatDateStamp(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function uploadMaster(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });
    const history = await pricingService.processUpload(req.file, req.user.sub);
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
    const uploads = await pricingService.listUploads();
    res.json({ uploads });
  } catch (err) {
    next(err);
  }
}

async function rollback(req, res, next) {
  try {
    const id = Number(req.params.id);
    const target = await pricingService.rollbackToVersion(id);
    res.json({ message: `Rollback ke versi ${target.version} berhasil`, uploadId: target.id });
  } catch (err) {
    next(err);
  }
}

async function deleteUpload(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pricingService.deleteUploadVersion(id);
    res.json({ message: 'Versi upload dihapus' });
  } catch (err) {
    next(err);
  }
}

async function downloadErrorLog(req, res, next) {
  try {
    const id = Number(req.params.id);
    const workbook = await pricingService.getErrorLogWorkbook(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Error_Log_Upload_${id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { materialNumbers, status, category, plant } = req.body;
    if (!Array.isArray(materialNumbers) || materialNumbers.length === 0) {
      return res.status(400).json({ message: 'materialNumbers wajib diisi (array)' });
    }
    const result = await pricingService.searchMaterials({
      materialNumbers,
      status,
      category,
      plant,
      userId: req.user.sub,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportResults(req, res, next) {
  try {
    const { materialNumbers, status, category, plant } = req.body;
    if (!Array.isArray(materialNumbers) || materialNumbers.length === 0) {
      return res.status(400).json({ message: 'materialNumbers wajib diisi (array)' });
    }
    const { results } = await pricingService.searchMaterials({
      materialNumbers,
      status,
      category,
      plant,
      userId: null,
    });
    const workbook = await pricingService.buildExportWorkbook(results);
    const filename = `Pricing_Result_${formatDateStamp(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function getColumns(req, res, next) {
  try {
    const columns = await pricingService.getColumns();
    res.json({ columns });
  } catch (err) {
    next(err);
  }
}

async function updateColumns(req, res, next) {
  try {
    const { columns } = req.body;
    if (!Array.isArray(columns)) return res.status(400).json({ message: 'columns wajib diisi (array)' });
    const updated = await pricingService.updateColumns(columns);
    res.json({ columns: updated });
  } catch (err) {
    next(err);
  }
}

async function parseMaterialList(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });
    const materialNumbers = await parseMaterialNumberList(req.file.buffer, req.file.originalname);
    res.json({ materialNumbers });
  } catch (err) {
    next(err);
  }
}

async function getKpi(req, res, next) {
  try {
    const kpi = await pricingService.getKpi();
    res.json(kpi);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  uploadMaster,
  listUploads,
  rollback,
  deleteUpload,
  downloadErrorLog,
  search,
  exportResults,
  parseMaterialList,
  getColumns,
  updateColumns,
  getKpi,
};
