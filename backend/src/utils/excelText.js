// ExcelJS doesn't always hand back a plain scalar for a cell — rich text
// runs, hyperlinks, and formulas all come through as objects instead of a
// plain string/number. Naively calling String()/Number() on one of those
// yields "[object Object]" or NaN instead of the cell's actual content, so
// every cell value has to be unwrapped through here first.
function unwrapCellValue(value) {
  if (typeof value !== 'object' || value === null || value instanceof Date) return value;
  if (Array.isArray(value.richText)) return value.richText.map((run) => run.text).join('');
  if ('text' in value) return value.text; // hyperlink cell: { text, hyperlink }
  if ('result' in value) return value.result; // formula cell: { formula, result }
  return null; // unrecognized shape (e.g. { error: '#REF!' })
}

function cellText(value) {
  const unwrapped = unwrapCellValue(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === '') return null;
  const str = String(unwrapped).trim();
  return str ? str : null;
}

function cellNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(unwrapCellValue(value));
  return Number.isFinite(num) ? num : NaN;
}

module.exports = { cellText, cellNumber };
