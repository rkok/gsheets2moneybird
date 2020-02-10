const InvoiceRow = require('./model/InvoiceRow');

const REQUIRED_COLS = ['count', 'date', 'description', 'invoiceNo'];

/**
 * @param {array[]} rows
 * @param {number} defaultFee
 * @returns {InvoiceRow[]}
 */
const parseInvoiceRows = (rows, defaultFee) => {
  if (!rows.length) {
    throw new Error(`No rows in the given sheet`);
  }

  const cols = {
    count: null,
    fee: null,
    date: null,
    client: null,
    description: null,
    invoiceNo: null
  };

  rows[0].forEach((col, nc) => {
    if (col === 'Uren') cols.count = nc;
    else if (col === 'Uurtarief') cols.fee = nc;
    else if (col === 'Datum') cols.date = nc;
    else if (col === 'Klant') cols.client = nc;
    else if (col === 'Factuurnr.') cols.invoiceNo = nc;
    else if (col === 'Omschrijving') cols.description = nc;
  });

  if (!REQUIRED_COLS.every(col => cols[col] !== null)) {
    throw new Error(`Not all necessary columns are included in the sheet; `
      + REQUIRED_COLS.map(col => `${col}=${cols[col]}`).join(', '));
  }

  // Filter out rows we don't need
  // Column header row
  rows.shift();
  // No 'count' filled in
  rows = rows.filter(row => row[cols.count].length > 0);
  // Already have an invoice number
  rows = rows.filter(row => !row[cols.invoiceNo] || !row[cols.invoiceNo].length);

  return rows.map((row, nr) => {
    const irow = new InvoiceRow();
    irow.count = row[cols.count];
    irow.fee = cols.fee !== null ? row[cols.fee] : defaultFee;

    let desc = '';
    if (cols.client && row[cols.client]) {
      desc += `${row[cols.client]}: `;
    }
    desc += row[cols.description];
    irow.description = desc;

    try {
      irow.date = row[cols.date];
    } catch (e) {
      throw new Error(`Error mapping new invoice row ${nr}: ${e.message}`);
    }

    return irow;
  });
};

module.exports = { parseInvoiceRows };
