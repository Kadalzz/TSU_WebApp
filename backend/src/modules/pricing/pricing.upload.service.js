const ExcelJS = require('exceljs');
const { Readable } = require('stream');

const HEADER_MAP = {
  'material number': 'materialNumber',
  'material no': 'materialNumber',
  description: 'description',
  price: 'price',
  discount: 'discount',
  'net price': 'netPrice',
  currency: 'currency',
  status: 'status',
  category: 'category',
  plant: 'plant',
  stock: 'stock',
  'effective date': 'effectiveDate',
};

const CATEGORY_MAP = {
  lubricant: 'Lubricant',
  consumable: 'Consumable',
  'spare part': 'Spare_Part',
  undercarriage: 'Undercarriage',
  attachment: 'Attachment',
};

const PLANT_VALUES = ['Jakarta', 'Surabaya', 'Balikpapan'];

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

  if (!columnIndexMap.materialNumber || !columnIndexMap.price) {
    const err = new Error('Kolom "Material Number" dan "Price" wajib ada di file Excel.');
    err.status = 400;
    throw err;
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.values.length <= 1) return; // skip fully empty rows

    const getCell = (field) => {
      const idx = columnIndexMap[field];
      if (!idx) return null;
      return row.getCell(idx).value;
    };

    rows.push({
      rowNumber,
      materialNumber: getCell('materialNumber'),
      description: getCell('description'),
      price: getCell('price'),
      discount: getCell('discount'),
      netPrice: getCell('netPrice'),
      currency: getCell('currency'),
      status: getCell('status'),
      category: getCell('category'),
      plant: getCell('plant'),
      stock: getCell('stock'),
      effectiveDate: getCell('effectiveDate'),
    });
  });

  return rows;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed; // undefined = invalid
}

function normalizeCategory(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return CATEGORY_MAP[key] || null;
}

function normalizePlant(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return PLANT_VALUES.find((p) => p.toLowerCase() === key) || null;
}

function validateRow(raw) {
  const errors = [];

  const materialNumber = raw.materialNumber != null ? String(raw.materialNumber).trim() : '';
  if (!materialNumber) errors.push('Material Number wajib diisi');

  let price = null;
  if (raw.price === null || raw.price === undefined || raw.price === '') {
    errors.push('Price wajib diisi');
  } else {
    price = parseNumber(raw.price);
    if (Number.isNaN(price)) errors.push('Price harus berupa angka');
  }

  let discount = null;
  if (raw.discount != null && raw.discount !== '') {
    discount = parseNumber(raw.discount);
    if (Number.isNaN(discount)) errors.push('Discount harus berupa angka');
  }

  let netPrice = null;
  if (raw.netPrice != null && raw.netPrice !== '') {
    netPrice = parseNumber(raw.netPrice);
    if (Number.isNaN(netPrice)) errors.push('Net Price harus berupa angka');
  }

  let status = 'active';
  if (raw.status != null && raw.status !== '') {
    const normalized = String(raw.status).trim().toLowerCase();
    if (normalized !== 'active' && normalized !== 'inactive') {
      errors.push('Status harus "Active" atau "Inactive"');
    } else {
      status = normalized;
    }
  }

  let category = null;
  if (raw.category != null && raw.category !== '') {
    category = normalizeCategory(raw.category);
    if (!category) errors.push(`Category "${raw.category}" tidak dikenali`);
  }

  let plant = null;
  if (raw.plant != null && raw.plant !== '') {
    plant = normalizePlant(raw.plant);
    if (!plant) errors.push(`Plant "${raw.plant}" tidak dikenali`);
  }

  let stock = null;
  if (raw.stock != null && raw.stock !== '') {
    const parsedStock = parseInt(raw.stock, 10);
    if (Number.isNaN(parsedStock)) {
      errors.push('Stock harus berupa angka');
    } else {
      stock = parsedStock;
    }
  }

  let effectiveDate = null;
  if (raw.effectiveDate != null && raw.effectiveDate !== '') {
    const parsed = parseDate(raw.effectiveDate);
    if (parsed === undefined) {
      errors.push('Effective Date tidak valid');
    } else {
      effectiveDate = parsed;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      materialNumber,
      description: raw.description != null ? String(raw.description).trim() : null,
      price,
      discount,
      netPrice,
      currency: raw.currency ? String(raw.currency).trim() : 'IDR',
      status,
      category,
      plant,
      stock,
      effectiveDate,
    },
  };
}

async function parseMaterialNumberList(buffer, originalName) {
  const workbook = new ExcelJS.Workbook();
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  if (ext === 'csv') {
    await workbook.csv.read(Readable.from(buffer));
  } else if (ext === 'xlsx') {
    await workbook.xlsx.load(buffer);
  } else {
    const err = new Error('Format file tidak didukung. Gunakan .xlsx atau .csv.');
    err.status = 400;
    throw err;
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const materialNumbers = [];
  worksheet.eachRow((row, rowNumber) => {
    const value = row.getCell(1).value;
    if (value == null || value === '') return;
    const text = String(value).trim();
    if (!text) return;
    if (rowNumber === 1 && /material|code/i.test(text)) return; // skip header row
    materialNumbers.push(text);
  });

  return materialNumbers;
}

module.exports = {
  loadWorkbookRows,
  validateRow,
  normalizeCategory,
  normalizePlant,
  parseMaterialNumberList,
  CATEGORY_MAP,
  PLANT_VALUES,
};
