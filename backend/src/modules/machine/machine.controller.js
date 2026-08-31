const multer = require('multer');
const machineService = require('./machine.service');

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
    const history = await machineService.processUpload(req.file, req.user.sub);
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
    res.json({ uploads: await machineService.listUploads() });
  } catch (err) {
    next(err);
  }
}

async function rollback(req, res, next) {
  try {
    const target = await machineService.rollbackToVersion(Number(req.params.id));
    res.json({ message: `Rollback ke versi ${target.version} berhasil`, uploadId: target.id });
  } catch (err) {
    next(err);
  }
}

async function deleteUpload(req, res, next) {
  try {
    await machineService.deleteUploadVersion(Number(req.params.id));
    res.json({ message: 'Versi upload dihapus' });
  } catch (err) {
    next(err);
  }
}

async function downloadErrorLog(req, res, next) {
  try {
    const id = Number(req.params.id);
    const workbook = await machineService.getErrorLogWorkbook(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Machine_Error_Log_Upload_${id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { materialNumbers } = req.body;
    if (!Array.isArray(materialNumbers) || materialNumbers.length === 0) {
      return res.status(400).json({ message: 'materialNumbers wajib diisi (array)' });
    }
    const includeCogs = req.user.role === 'admin';
    const result = await machineService.searchMaterials({ materialNumbers, userId: req.user.sub, includeCogs });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportResults(req, res, next) {
  try {
    const { materialNumbers } = req.body;
    if (!Array.isArray(materialNumbers) || materialNumbers.length === 0) {
      return res.status(400).json({ message: 'materialNumbers wajib diisi (array)' });
    }
    const includeCogs = req.user.role === 'admin';
    const { results } = await machineService.searchMaterials({ materialNumbers, userId: null, includeCogs });
    const workbook = await machineService.buildExportWorkbook(results, includeCogs);
    const filename = `Machine_Result_${formatDateStamp(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
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
};
