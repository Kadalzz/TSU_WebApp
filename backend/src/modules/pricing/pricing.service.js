const ExcelJS = require('exceljs');
const prisma = require('../../config/db');
const {
  loadWorkbookRows,
  validateRow,
  normalizeCategory,
  normalizePlant,
} = require('./pricing.upload.service');

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

  await prisma.$transaction([
    prisma.pricingUploadHistory.updateMany({ data: { isActiveVersion: false }, where: {} }),
    prisma.pricingUploadHistory.update({ where: { id: uploadId }, data: { isActiveVersion: true } }),
  ]);

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

  await prisma.pricingMaster.deleteMany({ where: { uploadVersionId: uploadId } });
  await prisma.pricingUploadHistory.delete({ where: { id: uploadId } });
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

async function searchMaterials({ materialNumbers, status, category, plant, userId }) {
  const start = Date.now();
  const cleaned = [...new Set(materialNumbers.map((m) => String(m).trim()).filter(Boolean))];

  const where = {
    materialNumber: { in: cleaned },
    uploadVersion: { isActiveVersion: true },
  };
  if (status) where.status = String(status).toLowerCase();
  if (category) {
    const normalized = normalizeCategory(category) || category;
    where.category = normalized;
  }
  if (plant) {
    const normalized = normalizePlant(plant) || plant;
    where.plant = normalized;
  }

  const results = await prisma.pricingMaster.findMany({ where, orderBy: { materialNumber: 'asc' } });

  const foundNumbers = new Set(results.map((r) => r.materialNumber));
  const notFound = cleaned.filter((m) => !foundNumbers.has(m));

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
    { header: 'Material No', key: 'materialNumber', width: 20 },
    { header: 'Description', key: 'description', width: 32 },
    { header: 'Price', key: 'price', width: 14 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Net Price', key: 'netPrice', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Plant', key: 'plant', width: 12 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Effective Date', key: 'effectiveDate', width: 16 },
  ];

  results.forEach((r) =>
    sheet.addRow({
      materialNumber: r.materialNumber,
      description: r.description,
      price: r.price,
      discount: r.discount,
      netPrice: r.netPrice,
      currency: r.currency,
      plant: r.plant,
      stock: r.stock,
      status: r.status,
      category: r.category ? r.category.replace('_', ' ') : '',
      effectiveDate: r.effectiveDate ? r.effectiveDate.toISOString().slice(0, 10) : '',
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
