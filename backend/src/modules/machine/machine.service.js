const ExcelJS = require('exceljs');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/db');
const { loadWorkbookRows, validateRow } = require('./machine.upload.service');

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

  const lastUpload = await prisma.machineUploadHistory.findFirst({ orderBy: { version: 'desc' } });
  const nextVersion = (lastUpload?.version || 0) + 1;
  const shouldActivate = validRecords.length > 0;

  const uploadHistory = await prisma.machineUploadHistory.create({
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
    await prisma.machineMaster.createMany({
      data: validRecords.map((r) => ({ ...r, uploadVersionId: uploadHistory.id })),
    });
    await prisma.machineUploadHistory.updateMany({
      where: { id: { not: uploadHistory.id } },
      data: { isActiveVersion: false },
    });
  }

  return uploadHistory;
}

async function listUploads() {
  return prisma.machineUploadHistory.findMany({
    orderBy: { version: 'desc' },
    include: { uploader: { select: { name: true, email: true } } },
  });
}

async function rollbackToVersion(uploadId) {
  const target = await prisma.machineUploadHistory.findUnique({ where: { id: uploadId } });
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
      prisma.machineUploadHistory.updateMany({ data: { isActiveVersion: false }, where: {} }),
      prisma.machineUploadHistory.update({ where: { id: uploadId }, data: { isActiveVersion: true } }),
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
  const target = await prisma.machineUploadHistory.findUnique({ where: { id: uploadId } });
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
    await prisma.machineMaster.deleteMany({ where: { uploadVersionId: uploadId } });
    await prisma.machineUploadHistory.delete({ where: { id: uploadId } });
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
  const upload = await prisma.machineUploadHistory.findUnique({ where: { id: uploadId } });
  if (!upload) {
    const err = new Error('Upload history tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Error Log');
  sheet.columns = [
    { header: 'Row', key: 'row', width: 8 },
    { header: 'Material', key: 'materialNumber', width: 22 },
    { header: 'Reasons', key: 'reasons', width: 60 },
  ];
  (upload.errorLog || []).forEach((e) =>
    sheet.addRow({ row: e.row, materialNumber: e.materialNumber, reasons: e.reasons.join('; ') })
  );

  return workbook;
}

// COGS is confidential — includeCogs is only ever true for an admin caller
// (see machine.controller.js), so a non-admin (Sales) response never carries
// the field at all, not just a hidden column in the UI.
async function searchMaterials({ materialNumbers, userId, includeCogs }) {
  const start = Date.now();
  const cleaned = [...new Set(materialNumbers.map((m) => String(m).trim()).filter(Boolean))];

  const where = {
    uploadVersion: { isActiveVersion: true },
    OR: cleaned.map((code) => ({ materialNumber: { startsWith: code, mode: 'insensitive' } })),
  };

  const rows = await prisma.machineMaster.findMany({ where, orderBy: { materialNumber: 'asc' } });

  const results = rows.map((r) => ({
    id: r.id,
    materialNumber: r.materialNumber,
    description: r.description,
    price: r.price,
    ...(includeCogs ? { cogs: r.cogs } : {}),
  }));

  const notFound = cleaned.filter(
    (code) => !rows.some((r) => r.materialNumber.toLowerCase().startsWith(code.toLowerCase()))
  );

  const responseTimeMs = Date.now() - start;

  return { results, notFound, meta: { totalRequested: cleaned.length, totalFound: results.length, responseTimeMs } };
}

async function buildExportWorkbook(results, includeCogs) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Machine Result');
  sheet.columns = [
    { header: 'Material', key: 'materialNumber', width: 20 },
    { header: 'Description', key: 'description', width: 32 },
    ...(includeCogs ? [{ header: 'COGS', key: 'cogs', width: 16 }] : []),
    { header: 'Selling Price', key: 'price', width: 16 },
  ];

  results.forEach((r) =>
    sheet.addRow({
      materialNumber: r.materialNumber,
      description: r.description,
      ...(includeCogs ? { cogs: r.cogs } : {}),
      price: r.price,
    })
  );

  return workbook;
}

module.exports = {
  processUpload,
  listUploads,
  rollbackToVersion,
  deleteUploadVersion,
  getErrorLogWorkbook,
  searchMaterials,
  buildExportWorkbook,
};
