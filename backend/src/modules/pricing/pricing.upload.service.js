const ExcelJS = require('exceljs');
const { Readable } = require('stream');

const HEADER_MAP = {
  'material code': 'materialNumber',
  'material number': 'materialNumber',
  'material no': 'materialNumber',
  'material description': 'description',
  description: 'description',
  'valuation type': 'valuationType',
  'pricing date': 'pricingDate',
  currency: 'currency',
  'new be code': 'newBeCode',
  'new commodity code': 'newCommodityCode',
  'current sp': 'price',
  price: 'price',
  'remarks for material': 'remarksForMaterial',
  'replacement part no': 'replacementPartNo',
  'val type for replacement part no': 'valTypeForReplacementPartNo',
  remarks: 'valTypeForReplacementPartNo',
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
    const err = new Error(
      'Kolom "Material Code" dan "Current SP" wajib ada di file Excel.'
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
      materialNumber: getCell('materialNumber'),
      description: getCell('description'),
      valuationType: getCell('valuationType'),
      pricingDate: getCell('pricingDate'),
      currency: getCell('currency'),
      newBeCode: getCell('newBeCode'),
      newCommodityCode: getCell('newCommodityCode'),
      price: getCell('price'),
      remarksForMaterial: getCell('remarksForMaterial'),
      replacementPartNo: getCell('replacementPartNo'),
      valTypeForReplacementPartNo: getCell('valTypeForReplacementPartNo'),
    };

    // A row can carry leftover cell formatting (borders/fill from a table
    // style applied to a wide blank range) without any real value in it —
    // row.values.length alone can't tell a "styled but empty" row from a
    // real one, so only skip rows where NONE of our recognized columns
    // actually have a value.
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

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed; // undefined = invalid
}

function asText(value) {
  return value != null && value !== '' ? String(value).trim() : null;
}

function validateRow(raw) {
  const errors = [];

  const materialNumber = raw.materialNumber != null ? String(raw.materialNumber).trim() : '';
  if (!materialNumber) errors.push('Material Code wajib diisi');

  let price = null;
  if (raw.price === null || raw.price === undefined || raw.price === '') {
    errors.push('Current SP wajib diisi');
  } else {
    price = parseNumber(raw.price);
    if (Number.isNaN(price)) errors.push('Current SP harus berupa angka');
  }

  let pricingDate = null;
  if (raw.pricingDate != null && raw.pricingDate !== '') {
    const parsed = parseDate(raw.pricingDate);
    if (parsed === undefined) {
      errors.push('Pricing Date tidak valid');
    } else {
      pricingDate = parsed;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      materialNumber,
      description: asText(raw.description),
      valuationType: asText(raw.valuationType),
      pricingDate,
      currency: raw.currency ? String(raw.currency).trim() : 'IDR',
      newBeCode: asText(raw.newBeCode),
      newCommodityCode: asText(raw.newCommodityCode),
      price,
      remarksForMaterial: asText(raw.remarksForMaterial),
      replacementPartNo: asText(raw.replacementPartNo),
      valTypeForReplacementPartNo: asText(raw.valTypeForReplacementPartNo),
    },
  };
}

module.exports = { loadWorkbookRows, validateRow };
