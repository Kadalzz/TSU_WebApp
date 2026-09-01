const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const { cellText, cellNumber } = require('../../utils/excelText');

const HEADER_MAP = {
  material: 'materialNumber',
  'material code': 'materialNumber',
  'material number': 'materialNumber',
  description: 'description',
  cogs: 'cogs',
  price: 'price',
  'selling price': 'price',
};

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
    const err = new Error('Kolom "Material" dan "Selling Price" wajib ada di file Excel.');
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
      materialNumber: getCell('materialNumber'),
      description: getCell('description'),
      cogs: getCell('cogs'),
      price: getCell('price'),
    };

    // A row can carry leftover cell formatting (borders/fill from a table
    // style applied to a wide blank range) without any real value in it —
    // only skip rows where NONE of the recognized columns have a value.
    const hasAnyValue = Object.values(rawRow).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    );
    if (!hasAnyValue) return;

    rows.push({ rowNumber, ...rawRow });
  });

  return rows;
}

const parseNumber = cellNumber;
const asText = cellText;

function validateRow(raw) {
  const errors = [];

  const materialNumber = cellText(raw.materialNumber) || '';
  if (!materialNumber) errors.push('Material wajib diisi');

  let price = null;
  if (raw.price === null || raw.price === undefined || raw.price === '') {
    errors.push('Selling Price wajib diisi');
  } else {
    price = parseNumber(raw.price);
    if (Number.isNaN(price)) errors.push('Selling Price harus berupa angka');
  }

  let cogs = null;
  if (raw.cogs !== null && raw.cogs !== undefined && raw.cogs !== '') {
    cogs = parseNumber(raw.cogs);
    if (Number.isNaN(cogs)) errors.push('COGS harus berupa angka');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      materialNumber,
      description: asText(raw.description),
      cogs,
      price,
    },
  };
}

module.exports = { loadWorkbookRows, validateRow };
