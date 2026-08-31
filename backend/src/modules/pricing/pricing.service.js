const ExcelJS = require('exceljs');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/db');
const { loadWorkbookRows, validateRow } = require('./pricing.upload.service');

// Two clicks on Hapus/Rollback in quick succession can both pass the
// existence check before either write lands — Prisma's "record not found"
// (P2025) on the second one is expected, not a bug, so surface it as a
// normal 404 instead of leaking the raw ORM error to the client.
function isRecordNotFoundError(err) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

async function processUpload(file, userId) {
  const rows = await loadWorkbookRows(file.buffer, file.originalname);

  const validRecords = [];
  const errorLog = [];

  rows.forEach((raw) => {
    const { isValid, errors, data } = validateRow(raw);
    if (isValid) {
      validRecords.push(data);
    } else {
      errorLog.push({ row: raw.rowNumber, materialNumber: raw.materialNumber || '', reasons: errors });
    }
  });

  const lastUpload = await prisma.pricingUploadHistory.findFirst({ orderBy: { version: 'desc' } });
  const nextVersion = (lastUpload?.version || 0) + 1;
  const shouldActivate = validRecords.length > 0;

  const uploadHistory = await prisma.pricingUploadHistory.create({
    data: {
      filename: file.originalname,
      uploadedBy: userId,
      version: nextVersion,
      totalRecords: rows.length,
      successCount: validRecords.length,
      failedCount: errorLog.length,
      errorLog: errorLog.length ? errorLog : undefined,
      isActiveVersion: shouldActivate,
    },
  });

  if (shouldActivate) {
    await prisma.pricingMaster.createMany({
      data: validRecords.map((r) => ({ ...r, uploadVersionId: uploadHistory.id })),
    });
    await prisma.pricingUploadHistory.updateMany({
      where: { id: { not: uploadHistory.id } },
      data: { isActiveVersion: false },
    });
  }

  return uploadHistory;
}

async function listUploads() {
  return prisma.pricingUploadHistory.findMany({
    orderBy: { version: 'desc' },
    include: { uploader: { select: { name: true, email: true } } },
  });
}

async function rollbackToVersion(uploadId) {
  const target = await prisma.pricingUploadHistory.findUnique({ where: { id: uploadId } });
  if (!target) {
    const err = new Error('Upload history tidak ditemukan');
    err.status = 404;
    throw err;
  }
  if (target.successCount === 0) {
    const err = new Error('Tidak bisa rollback ke versi yang tidak punya data valid');
    err.status = 400;
    throw err;
  }

  try {
    await prisma.$transaction([
      prisma.pricingUploadHistory.updateMany({ data: { isActiveVersion: false }, where: {} }),
      prisma.pricingUploadHistory.update({ where: { id: uploadId }, data: { isActiveVersion: true } }),
    ]);
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      const e = new Error('Versi ini sudah tidak ada (mungkin sudah dihapus/diubah di tab lain)');
      e.status = 404;
      throw e;
    }
    throw err;
  }

  return target;
}

async function deleteUploadVersion(uploadId) {
  const target = await prisma.pricingUploadHistory.findUnique({ where: { id: uploadId } });
  if (!target) {
    const err = new Error('Upload history tidak ditemukan');
    err.status = 404;
    throw err;
  }
  if (target.isActiveVersion) {
    const err = new Error('Tidak bisa hapus versi yang sedang aktif. Rollback ke versi lain dulu.');
    err.status = 400;
    throw err;
  }

  try {
    await prisma.pricingMaster.deleteMany({ where: { uploadVersionId: uploadId } });
    await prisma.pricingUploadHistory.delete({ where: { id: uploadId } });
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      const e = new Error('Versi ini sudah dihapus sebelumnya');
      e.status = 404;
      throw e;
    }
    throw err;
  }
}

async function getErrorLogWorkbook(uploadId) {
  const upload = await prisma.pricingUploadHistory.findUnique({ where: { id: uploadId } });
  if (!upload) {
    const err = new Error('Upload history tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Error Log');
  sheet.columns = [
    { header: 'Row', key: 'row', width: 8 },
    { header: 'Material Number', key: 'materialNumber', width: 22 },
    { header: 'Reasons', key: 'reasons', width: 60 },
  ];
  (upload.errorLog || []).forEach((e) =>
    sheet.addRow({ row: e.row, materialNumber: e.materialNumber, reasons: e.reasons.join('; ') })
  );

  return workbook;
}

async function searchMaterials({ materialNumbers, userId }) {
  const start = Date.now();
  const cleaned = [...new Set(materialNumbers.map((m) => String(m).trim()).filter(Boolean))];

  // Prefix match (case-insensitive): searching a bare code like "6395271"
  // must also surface variants like "6395271:SE" / "6395271:AA" that share
  // that base number but differ in suffix/case.
  const where = {
    uploadVersion: { isActiveVersion: true },
    OR: cleaned.map((code) => ({ materialNumber: { startsWith: code, mode: 'insensitive' } })),
  };

  const results = await prisma.pricingMaster.findMany({ where, orderBy: { materialNumber: 'asc' } });

  const notFound = cleaned.filter(
    (code) => !results.some((r) => r.materialNumber.toLowerCase().startsWith(code.toLowerCase()))
  );

  const responseTimeMs = Date.now() - start;

  if (userId) {
    prisma.pricingSearchLog
      .create({ data: { userId, searchedCount: cleaned.length, responseTimeMs } })
      .catch((err) => console.error('Failed to write search log', err));
  }

  return { results, notFound, meta: { totalRequested: cleaned.length, totalFound: results.length, responseTimeMs } };
}

async function buildExportWorkbook(results) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pricing Result');
  sheet.columns = [
    { header: 'Material Code', key: 'materialNumber', width: 20 },
    { header: 'Material Description', key: 'description', width: 32 },
    { header: 'Valuation Type', key: 'valuationType', width: 16 },
    { header: 'Pricing Date', key: 'pricingDate', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'New BE Code', key: 'newBeCode', width: 16 },
    { header: 'New Commodity Code', key: 'newCommodityCode', width: 18 },
    { header: 'Current SP', key: 'price', width: 14 },
    { header: 'Remarks for Material', key: 'remarksForMaterial', width: 30 },
    { header: 'Replacement Part No', key: 'replacementPartNo', width: 20 },
    { header: 'Remarks', key: 'valTypeForReplacementPartNo', width: 26 },
  ];

  results.forEach((r) =>
    sheet.addRow({
      materialNumber: r.materialNumber,
      description: r.description,
      valuationType: r.valuationType,
      pricingDate: r.pricingDate ? r.pricingDate.toISOString().slice(0, 10) : '',
      currency: r.currency,
      newBeCode: r.newBeCode,
      newCommodityCode: r.newCommodityCode,
      price: r.price,
      remarksForMaterial: r.remarksForMaterial,
      replacementPartNo: r.replacementPartNo,
      valTypeForReplacementPartNo: r.valTypeForReplacementPartNo,
    })
  );

  return workbook;
}

async function getColumns() {
  return prisma.pricingColumnConfig.findMany({ orderBy: { sortOrder: 'asc' } });
}

async function updateColumns(columns) {
  await prisma.$transaction(
    columns.map((c) =>
      prisma.pricingColumnConfig.update({
        where: { id: c.id },
        data: { isVisible: c.isVisible, sortOrder: c.sortOrder },
      })
    )
  );
  return getColumns();
}

async function getKpi() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalSearched, avgResponse, monthlyVolume, recordsAvailable] = await Promise.all([
    prisma.pricingSearchLog.aggregate({ _sum: { searchedCount: true } }),
    prisma.pricingSearchLog.aggregate({ _avg: { responseTimeMs: true } }),
    prisma.pricingSearchLog.aggregate({
      _sum: { searchedCount: true },
      where: { searchedAt: { gte: startOfMonth } },
    }),
    prisma.pricingMaster.count({ where: { uploadVersion: { isActiveVersion: true } } }),
  ]);

  return {
    totalMaterialSearched: totalSearched._sum.searchedCount || 0,
    averageResponseTimeMs: Math.round(avgResponse._avg.responseTimeMs || 0),
    monthlySearchVolume: monthlyVolume._sum.searchedCount || 0,
    pricingRecordsAvailable: recordsAvailable,
  };
}

module.exports = {
  processUpload,
  listUploads,
  rollbackToVersion,
  deleteUploadVersion,
  getErrorLogWorkbook,
  searchMaterials,
  buildExportWorkbook,
  getColumns,
  updateColumns,
  getKpi,
};
