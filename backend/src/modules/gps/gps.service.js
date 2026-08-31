const ExcelJS = require('exceljs');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/db');
const { loadWorkbookRows, validateRow, deriveModelPrefix, parseMarginRemark } = require('./gps.upload.service');

// Two clicks on Hapus/Rollback in quick succession can both pass the
// existence check before either write lands — Prisma's "record not found"
// (P2025) on the second one is expected, not a bug, so surface it as a
// normal 404 instead of leaking the raw ORM error to the client.
function isRecordNotFoundError(err) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

// Threshold-based classification — used only as a FALLBACK when a row has no
// (or an unrecognized) "Remarks bottom margin" value. When the remark is present and
// recognized, it is the authoritative source (see resolveMarginCategory below).
function classifyMarginByThreshold(gp, gpPercent, targetGpPercent) {
  if (gpPercent === null || gpPercent === undefined) return 'unclassified';
  if (Number(gp) < 0) return 'not_achieved';
  if (targetGpPercent === null || targetGpPercent === undefined) return 'unclassified';
  return Number(gpPercent) < Number(targetGpPercent) ? 'underperforming' : 'achieved';
}

function resolveMarginCategory({ remarkCategory, gp, gpPercent, targetGpPercent }) {
  if (remarkCategory) return remarkCategory;
  return classifyMarginByThreshold(gp, gpPercent, targetGpPercent);
}

async function processUpload(file, userId) {
  const rows = await loadWorkbookRows(file.buffer, file.originalname);
  const models = await prisma.gpsModel.findMany();
  const modelByPrefix = new Map(models.map((m) => [m.codePrefix, m]));

  const validRecords = [];
  const errorLog = [];

  rows.forEach((raw) => {
    const { isValid, errors, data } = validateRow(raw);
    if (!isValid) {
      errorLog.push({ row: raw.rowNumber, salesName: raw.salesName || '', reasons: errors });
      return;
    }
    const prefix = deriveModelPrefix(data.materialNo);
    const model = prefix ? modelByPrefix.get(prefix) : null;
    validRecords.push({ ...data, modelId: model ? model.id : null });
  });

  const materialNos = [...new Set(validRecords.map((r) => r.materialNo).filter(Boolean))];
  const mappings = materialNos.length
    ? await prisma.gpsMaterialNoSubModelMap.findMany({
        where: { materialNo: { in: materialNos } },
        include: { subModel: true },
      })
    : [];
  const mapByMaterialNo = new Map(mappings.map((m) => [m.materialNo, m]));

  const finalRecords = validRecords.map((r) => {
    const mapping = r.materialNo ? mapByMaterialNo.get(r.materialNo) : null;
    const subModelId = mapping ? mapping.subModelId : null;
    const targetGpPercent = mapping ? mapping.subModel.targetGpPercent : null;
    const marginCategory = resolveMarginCategory({
      remarkCategory: r.remarkCategory,
      gp: r.gp,
      gpPercent: r.gpPercent,
      targetGpPercent,
    });
    return { ...r, subModelId, marginCategory };
  });

  const lastUpload = await prisma.salesGpsUploadHistory.findFirst({ orderBy: { version: 'desc' } });
  const nextVersion = (lastUpload?.version || 0) + 1;
  const shouldActivate = finalRecords.length > 0;

  const uploadHistory = await prisma.salesGpsUploadHistory.create({
    data: {
      filename: file.originalname,
      uploadedBy: userId,
      version: nextVersion,
      totalRecords: rows.length,
      successCount: finalRecords.length,
      failedCount: errorLog.length,
      errorLog: errorLog.length ? errorLog : undefined,
      isActiveVersion: shouldActivate,
    },
  });

  if (shouldActivate) {
    await prisma.salesGpsTransaction.createMany({
      data: finalRecords.map((r) => ({
        invoiceDate: r.invoiceDate,
        salesName: r.salesName,
        customerName: r.customerName,
        materialNo: r.materialNo,
        materialDescription: r.materialDescription,
        serialNo: r.serialNo,
        salesArea: r.salesArea,
        revenue: r.revenue,
        cost: r.cost,
        gp: r.gp,
        gpPercent: r.gpPercent,
        marginRemark: r.marginRemark,
        modelId: r.modelId,
        subModelId: r.subModelId,
        marginCategory: r.marginCategory,
        uploadVersionId: uploadHistory.id,
      })),
    });
    await prisma.salesGpsUploadHistory.updateMany({
      where: { id: { not: uploadHistory.id } },
      data: { isActiveVersion: false },
    });
  }

  return uploadHistory;
}

async function listUploads() {
  return prisma.salesGpsUploadHistory.findMany({
    orderBy: { version: 'desc' },
    include: { uploader: { select: { name: true, email: true } } },
  });
}

async function rollbackToVersion(uploadId) {
  const target = await prisma.salesGpsUploadHistory.findUnique({ where: { id: uploadId } });
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
      prisma.salesGpsUploadHistory.updateMany({ data: { isActiveVersion: false }, where: {} }),
      prisma.salesGpsUploadHistory.update({ where: { id: uploadId }, data: { isActiveVersion: true } }),
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
  const target = await prisma.salesGpsUploadHistory.findUnique({ where: { id: uploadId } });
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
    await prisma.salesGpsTransaction.deleteMany({ where: { uploadVersionId: uploadId } });
    await prisma.salesGpsUploadHistory.delete({ where: { id: uploadId } });
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
  const upload = await prisma.salesGpsUploadHistory.findUnique({ where: { id: uploadId } });
  if (!upload) {
    const err = new Error('Upload history tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Error Log');
  sheet.columns = [
    { header: 'Row', key: 'row', width: 8 },
    { header: 'Sales Name', key: 'salesName', width: 22 },
    { header: 'Reasons', key: 'reasons', width: 60 },
  ];
  (upload.errorLog || []).forEach((e) =>
    sheet.addRow({ row: e.row, salesName: e.salesName, reasons: e.reasons.join('; ') })
  );

  return workbook;
}

// ---------- Models & Sub-Models ----------

async function getModels() {
  return prisma.gpsModel.findMany({
    orderBy: { codePrefix: 'asc' },
    include: { subModels: { orderBy: { name: 'asc' } } },
  });
}

async function createSubModel(modelId, { name, targetGpPercent }) {
  return prisma.gpsSubModel.create({
    data: { modelId, name, targetGpPercent },
  });
}

async function updateSubModel(id, { name, targetGpPercent, isActive }) {
  const updated = await prisma.gpsSubModel.update({
    where: { id },
    data: { name, targetGpPercent, isActive },
  });

  // target berubah -> re-klasifikasi transaksi yang pakai sub-model ini DAN belum
  // punya klasifikasi dari Remarks (remark tetap otoritatif, tidak boleh ditimpa)
  const affectedTransactions = await prisma.salesGpsTransaction.findMany({
    where: { subModelId: id },
    select: { id: true, gp: true, gpPercent: true, marginRemark: true },
  });

  await Promise.all(
    affectedTransactions.map((t) =>
      prisma.salesGpsTransaction.update({
        where: { id: t.id },
        data: {
          marginCategory: resolveMarginCategory({
            remarkCategory: parseMarginRemark(t.marginRemark),
            gp: t.gp,
            gpPercent: t.gpPercent,
            targetGpPercent: updated.targetGpPercent,
          }),
        },
      })
    )
  );

  return updated;
}

// ---------- Material -> Sub-Model mapping ----------

async function getUnclassifiedMaterials() {
  const rows = await prisma.salesGpsTransaction.groupBy({
    by: ['materialNo', 'modelId'],
    where: {
      subModelId: null,
      materialNo: { not: null },
      marginCategory: 'unclassified',
      uploadVersion: { isActiveVersion: true },
    },
    _count: { _all: true },
  });

  const modelIds = [...new Set(rows.map((r) => r.modelId).filter(Boolean))];
  const models = modelIds.length ? await prisma.gpsModel.findMany({ where: { id: { in: modelIds } } }) : [];
  const modelById = new Map(models.map((m) => [m.id, m]));

  return rows.map((r) => ({
    materialNo: r.materialNo,
    modelId: r.modelId,
    modelName: r.modelId ? modelById.get(r.modelId)?.name : null,
    transactionCount: r._count._all,
  }));
}

async function assignMaterialSubModel(materialNo, subModelId, userId) {
  const subModel = await prisma.gpsSubModel.findUnique({ where: { id: subModelId } });
  if (!subModel) {
    const err = new Error('Sub-model tidak ditemukan');
    err.status = 404;
    throw err;
  }

  await prisma.gpsMaterialNoSubModelMap.upsert({
    where: { materialNo },
    update: { subModelId, assignedBy: userId, assignedAt: new Date() },
    create: { materialNo, subModelId, assignedBy: userId },
  });

  const transactions = await prisma.salesGpsTransaction.findMany({
    where: { materialNo },
    select: { id: true, gp: true, gpPercent: true, marginRemark: true },
  });

  await Promise.all(
    transactions.map((t) =>
      prisma.salesGpsTransaction.update({
        where: { id: t.id },
        data: {
          subModelId,
          marginCategory: resolveMarginCategory({
            remarkCategory: parseMarginRemark(t.marginRemark),
            gp: t.gp,
            gpPercent: t.gpPercent,
            targetGpPercent: subModel.targetGpPercent,
          }),
        },
      })
    )
  );

  return { materialNo, subModelId, transactionsUpdated: transactions.length };
}

// ---------- Dashboard ----------

function buildFilterWhere({ year, month, salesName, customer, modelId, subModelId, salesArea }) {
  const where = { uploadVersion: { isActiveVersion: true } };

  if (month) {
    // "YYYY-MM" — both Year and Month dropdowns picked on the frontend.
    const [y, m] = month.split('-').map(Number);
    where.invoiceDate = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  } else if (year) {
    // Only the Year dropdown picked — filter the whole calendar year.
    const y = Number(year);
    where.invoiceDate = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  if (salesName) where.salesName = salesName;
  if (customer) where.customerName = customer;
  if (modelId) where.modelId = Number(modelId);
  if (subModelId) where.subModelId = Number(subModelId);
  if (salesArea) where.salesArea = salesArea;

  return where;
}

async function getFilterOptions() {
  const [salesNames, customers, salesAreas, models, invoiceDates] = await Promise.all([
    prisma.salesGpsTransaction.findMany({
      where: { uploadVersion: { isActiveVersion: true } },
      select: { salesName: true },
      distinct: ['salesName'],
      orderBy: { salesName: 'asc' },
    }),
    prisma.salesGpsTransaction.findMany({
      where: { uploadVersion: { isActiveVersion: true }, customerName: { not: null } },
      select: { customerName: true },
      distinct: ['customerName'],
      orderBy: { customerName: 'asc' },
    }),
    prisma.salesGpsTransaction.findMany({
      where: { uploadVersion: { isActiveVersion: true }, salesArea: { not: null } },
      select: { salesArea: true },
      distinct: ['salesArea'],
      orderBy: { salesArea: 'asc' },
    }),
    getModels(),
    prisma.salesGpsTransaction.findMany({
      where: { uploadVersion: { isActiveVersion: true } },
      select: { invoiceDate: true },
    }),
  ]);

  // Year options are derived from the actual invoice dates present in the
  // uploaded data (not the calendar's current year) — the data can be from
  // any past year, so a hardcoded "this year" list would always match zero rows.
  const years = [...new Set(invoiceDates.map((t) => String(t.invoiceDate.getUTCFullYear())))].sort();

  return {
    salesNames: salesNames.map((s) => s.salesName),
    customers: customers.map((c) => c.customerName),
    salesAreas: salesAreas.map((s) => s.salesArea),
    models,
    years,
  };
}

async function getDashboardSummary(filters) {
  const where = buildFilterWhere(filters);
  const grouped = await prisma.salesGpsTransaction.groupBy({
    by: ['marginCategory'],
    where,
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const categories = ['not_achieved', 'underperforming', 'achieved', 'unclassified'];

  return categories.map((cat) => {
    const found = grouped.find((g) => g.marginCategory === cat);
    const count = found ? found._count._all : 0;
    return { category: cat, count, percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0 };
  });
}

async function getDashboardRanking(filters) {
  const where = buildFilterWhere(filters);
  const grouped = await prisma.salesGpsTransaction.groupBy({
    by: ['salesName', 'marginCategory'],
    where,
    _count: { _all: true },
  });

  const bySales = new Map();
  grouped.forEach((g) => {
    if (!bySales.has(g.salesName)) {
      bySales.set(g.salesName, {
        salesName: g.salesName,
        not_achieved: 0,
        underperforming: 0,
        achieved: 0,
        unclassified: 0,
        total: 0,
      });
    }
    const entry = bySales.get(g.salesName);
    entry[g.marginCategory] = g._count._all;
    entry.total += g._count._all;
  });

  return [...bySales.values()].sort((a, b) => b.total - a.total);
}

async function getDashboardKpi(filters) {
  const where = buildFilterWhere(filters);
  const [aggregate, count, bestSalesGroup] = await Promise.all([
    prisma.salesGpsTransaction.aggregate({
      where,
      _sum: { revenue: true, gp: true },
      _avg: { gpPercent: true },
    }),
    prisma.salesGpsTransaction.count({ where }),
    prisma.salesGpsTransaction.groupBy({
      by: ['salesName'],
      where,
      _sum: { gp: true },
      orderBy: { _sum: { gp: 'desc' } },
      take: 1,
    }),
  ]);

  return {
    totalRevenue: aggregate._sum.revenue || 0,
    totalGp: aggregate._sum.gp || 0,
    averageMarginPercent: aggregate._avg.gpPercent ? Math.round(aggregate._avg.gpPercent * 100) / 100 : 0,
    totalTransaction: count,
    bestSales: bestSalesGroup[0]?.salesName || null,
    highestGp: bestSalesGroup[0]?._sum.gp || 0,
  };
}

async function getTransactions(filters, search) {
  const where = buildFilterWhere(filters);
  if (search) {
    where.OR = [
      { salesName: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { materialNo: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.salesGpsTransaction.findMany({
    where,
    orderBy: { invoiceDate: 'desc' },
    include: { model: true, subModel: true },
    take: 2000,
  });
}

async function buildTransactionExportWorkbook(transactions) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Detail Transaction');
  sheet.columns = [
    { header: 'Invoice Date', key: 'invoiceDate', width: 14 },
    { header: 'Sales Name', key: 'salesName', width: 20 },
    { header: 'Customer', key: 'customerName', width: 24 },
    { header: 'Material No', key: 'materialNo', width: 16 },
    { header: 'Material Description', key: 'materialDescription', width: 30 },
    { header: 'Serial No', key: 'serialNo', width: 16 },
    { header: 'Sales Area', key: 'salesArea', width: 14 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Sub Model', key: 'subModel', width: 18 },
    { header: 'Actual Revenue', key: 'revenue', width: 16 },
    { header: 'Cost', key: 'cost', width: 14 },
    { header: 'GP', key: 'gp', width: 14 },
    { header: 'Actual Gross Profit%', key: 'gpPercent', width: 18 },
    { header: 'Margin Category', key: 'marginCategory', width: 18 },
    { header: 'Remarks (source)', key: 'marginRemark', width: 24 },
  ];

  transactions.forEach((t) =>
    sheet.addRow({
      invoiceDate: t.invoiceDate.toISOString().slice(0, 10),
      salesName: t.salesName,
      customerName: t.customerName,
      materialNo: t.materialNo,
      materialDescription: t.materialDescription,
      serialNo: t.serialNo,
      salesArea: t.salesArea,
      model: t.model?.name || '',
      subModel: t.subModel?.name || '',
      revenue: t.revenue,
      cost: t.cost,
      gp: t.gp,
      gpPercent: t.gpPercent,
      marginCategory: t.marginCategory,
      marginRemark: t.marginRemark,
    })
  );

  return workbook;
}

async function buildRankingExportWorkbook(ranking) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sales Ranking');
  sheet.columns = [
    { header: 'Sales Name', key: 'salesName', width: 24 },
    { header: 'Loss GP', key: 'not_achieved', width: 14 },
    { header: 'Underperforming', key: 'underperforming', width: 16 },
    { header: 'Achieved', key: 'achieved', width: 12 },
    { header: 'Unclassified', key: 'unclassified', width: 14 },
    { header: 'Total', key: 'total', width: 10 },
  ];
  ranking.forEach((r) => sheet.addRow(r));
  return workbook;
}

module.exports = {
  processUpload,
  listUploads,
  rollbackToVersion,
  deleteUploadVersion,
  getErrorLogWorkbook,
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
  buildTransactionExportWorkbook,
  buildRankingExportWorkbook,
};
