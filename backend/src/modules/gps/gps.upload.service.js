const ExcelJS = require('exceljs');
const { Readable } = require('stream');

const HEADER_MAP = {
  'invoice date': 'invoiceDate',
  'billing date': 'invoiceDate',
  'sales name': 'salesName',
  ppsr: 'salesName',
  customer: 'customerName',
  'customer name': 'customerName',
  'sold-to-party name': 'customerName',
  'material no': 'materialNo',
  'material number': 'materialNo',
  'material description': 'materialDescription',
  'serial no': 'serialNo',
  'serial number': 'serialNo',
  revenue: 'revenue',
  'actual revenue': 'revenue',
  cost: 'cost',
  'actual gross profit %': 'actualGpPercent',
  'actual gross profit%': 'actualGpPercent',
  'actual gp %': 'actualGpPercent',
  'actual gp%': 'actualGpPercent',
  'gross profit %': 'actualGpPercent',
  'gross profit%': 'actualGpPercent',
  'remarks bottom margin': 'marginRemark',
  'sales area': 'salesArea',
};

// Real export files use a "Remarks bottom margin" text column (e.g. "a. Underperforming GP",
// "b. Achieved", "c. Loss GP") as the authoritative classification instead of raw Revenue/Cost.
const REMARK_PATTERNS = [
  { category: 'not_achieved', re: /loss|not achieved|rugi/i },
  { category: 'underperforming', re: /underperform/i },
  { category: 'achieved', re: /achieved/i },
];

function parseMarginRemark(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = REMARK_PATTERNS.find((p) => p.re.test(text));
  return match ? match.category : null;
}

async function loadWorkbookRows(buffer, originalName) {
  const workbook = new ExcelJS.Workbook();
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  if (ext === 'csv') {
    await workbook.csv.read(Readable.from(buffer));
  } else if (ext === 'xlsx') {
    await workbook.xlsx.load(buffer);
  } else {
    const err = new Error(
      'Format file tidak didukung. Gunakan .xlsx atau .csv (format .xls lama belum didukung, silakan convert ke .xlsx).'
    );
    err.status = 400;
    throw err;
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    const err = new Error('File Excel kosong atau tidak punya sheet.');
    err.status = 400;
    throw err;
  }

  const columnIndexMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value || '').trim().toLowerCase();
    if (HEADER_MAP[key]) {
      columnIndexMap[HEADER_MAP[key]] = colNumber;
    }
  });

  const required = ['invoiceDate', 'salesName'];
  const missing = required.filter((field) => !columnIndexMap[field]);
  if (missing.length > 0) {
    const err = new Error(
      `Kolom wajib berikut tidak ditemukan di file: ${missing.join(', ')}. Header yang wajib ada: Invoice Date (atau Billing date), Sales Name (atau PPSR).`
    );
    err.status = 400;
    throw err;
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const getCell = (field) => {
      const idx = columnIndexMap[field];
      if (!idx) return null;
      return row.getCell(idx).value;
    };

    const rawRow = {
      invoiceDate: getCell('invoiceDate'),
      salesName: getCell('salesName'),
      customerName: getCell('customerName'),
      materialNo: getCell('materialNo'),
      materialDescription: getCell('materialDescription'),
      serialNo: getCell('serialNo'),
      salesArea: getCell('salesArea'),
      revenue: getCell('revenue'),
      cost: getCell('cost'),
      actualGpPercent: getCell('actualGpPercent'),
      marginRemark: getCell('marginRemark'),
    };

    // Same rationale as the pricing parser: a row can carry leftover cell
    // formatting without any real value, so only skip rows where none of
    // our recognized columns actually have a value.
    const hasAnyValue = Object.values(rawRow).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    );
    if (!hasAnyValue) return;

    rows.push({ rowNumber, ...rawRow });
  });

  return rows;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return NaN;
  // A cell formatted as "Percentage" in Excel comes through as a fraction
  // (15.5% -> 0.155); a plain number column has the percent value directly
  // (15.5% -> 15.5). Values within [-1, 1] are assumed to be the fraction form.
  return Math.abs(num) <= 1 ? num * 100 : num;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function validateRow(raw) {
  const errors = [];

  const invoiceDate = parseDate(raw.invoiceDate);
  if (!raw.invoiceDate) {
    errors.push('Invoice Date wajib diisi');
  } else if (invoiceDate === undefined) {
    errors.push('Invoice Date tidak valid');
  }

  const salesName = raw.salesName != null ? String(raw.salesName).trim() : '';
  if (!salesName) errors.push('Sales Name wajib diisi');

  let revenue = null;
  if (raw.revenue != null && raw.revenue !== '') {
    revenue = parseNumber(raw.revenue);
    if (Number.isNaN(revenue)) errors.push('Revenue harus berupa angka');
  }

  let cost = null;
  if (raw.cost != null && raw.cost !== '') {
    cost = parseNumber(raw.cost);
    if (Number.isNaN(cost)) errors.push('Cost harus berupa angka');
  }

  const customerName = raw.customerName != null ? String(raw.customerName).trim() : null;
  const materialNo = raw.materialNo != null ? String(raw.materialNo).trim() : null;
  const materialDescription = raw.materialDescription != null ? String(raw.materialDescription).trim() : null;
  const serialNo = raw.serialNo != null ? String(raw.serialNo).trim() : null;
  const salesArea = raw.salesArea != null ? String(raw.salesArea).trim() : null;
  const marginRemark = raw.marginRemark != null ? String(raw.marginRemark).trim() : null;

  let actualGpPercent = null;
  if (raw.actualGpPercent != null && raw.actualGpPercent !== '') {
    actualGpPercent = normalizePercent(raw.actualGpPercent);
    if (Number.isNaN(actualGpPercent)) errors.push('Actual Gross Profit% harus berupa angka');
  }

  let gp = null;
  let gpPercent = null;
  if (actualGpPercent !== null && !Number.isNaN(actualGpPercent)) {
    // File already provides the computed GP% directly — trust it over
    // deriving from Revenue/Cost (which may not even be present).
    gpPercent = actualGpPercent;
    if (revenue !== null && !Number.isNaN(revenue)) {
      gp = (revenue * gpPercent) / 100;
    }
  } else if (revenue !== null && cost !== null && !Number.isNaN(revenue) && !Number.isNaN(cost)) {
    gp = revenue - cost;
    gpPercent = revenue !== 0 ? (gp / revenue) * 100 : gp === 0 ? 0 : null;
  }

  const remarkCategory = parseMarginRemark(marginRemark);
  if (marginRemark && !remarkCategory) {
    errors.push(`Remarks bottom margin "${marginRemark}" tidak dikenali (harus mengandung "Loss"/"Underperforming"/"Achieved")`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      invoiceDate,
      salesName,
      customerName,
      materialNo,
      materialDescription,
      serialNo,
      salesArea,
      revenue,
      cost,
      gp,
      gpPercent,
      marginRemark,
      remarkCategory,
    },
  };
}

function deriveModelPrefix(materialNo) {
  if (!materialNo) return null;
  const trimmed = String(materialNo).trim();
  return trimmed.length > 0 ? trimmed.charAt(0) : null;
}

module.exports = { loadWorkbookRows, validateRow, deriveModelPrefix, parseMarginRemark };
