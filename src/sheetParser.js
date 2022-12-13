const InvoiceRow = require('./model/InvoiceRow');
const { isWithinInterval } = require('date-fns');
const config = require('config');

const REQUIRED_COLS = ['count', 'date', 'description', 'invoiceNo'];

const parseDate = date => {
  const split = date.split('-');
  if (split[0].length === 4) {
    return new Date(`${date}T00:00:00.000Z`); // Assume YYYY-MM-DD
  }
  const [d, m, y] = split; // Assume DD-MM-YYYY
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
};

/**
 * @param {array[]} rows
 * @param {{}} opts
 * @returns {InvoiceRow[]}
 */
const parseInvoiceRows = (rows, opts) => {
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
    if (col === config.columnNames.numberOfHours) cols.count = nc;
    else if (col === config.columnNames.hourlyRate) cols.fee = nc;
    else if (col === config.columnNames.date) cols.date = nc;
    else if (col === config.columnNames.customer) cols.client = nc;
    else if (col === config.columnNames.invoiceNumber) cols.invoiceNo = nc;
    else if (col === config.columnNames.description) cols.description = nc;
  });

  if (!REQUIRED_COLS.every(col => cols[col] !== null)) {
    throw new Error(`Not all necessary columns are included in the sheet; `
      + REQUIRED_COLS.map(col => `${col}=${cols[col]}`).join(', '));
  }

  // Filter out rows we don't need
  // Column header row
  rows.shift();

  // No 'count' filled in
  rows = rows.filter(row => row[cols.count] && row[cols.count].length > 0);

  if (opts.dateRange) {
    // Not in date range
    const [start, end] = opts.dateRange;
    rows = rows.filter(row => {
      if (!row[cols.date]) {
        console.error('Skipping row due to missing date');
	      return false;
      }
      return isWithinInterval(parseDate(row[cols.date]), { start, end });
    });
  } else {
    // Already have an invoice number
    rows = rows.filter(row => !row[cols.invoiceNo] || !row[cols.invoiceNo].length);
  }

  return rows.map((row, nr) => {
    const irow = new InvoiceRow();
    irow.count = row[cols.count];
    irow.fee = cols.fee !== null && row[cols.fee] !== undefined && row[cols.fee].length > 0
      ? Number(row[cols.fee].replace(/€\s?/, '').replace(',', '.'))
      : opts.defaultFee;

    let desc = '';
    if (cols.client && row[cols.client]) {
      desc += `${row[cols.client]}: `;
    }
    desc += row[cols.description];
    irow.description = desc;

    try {
      irow.date = row[cols.date];
    } catch (e) {
      throw new Error(`Error mapping new invoice row ${nr}: ${e.message}  - row data: ${JSON.stringify(row)}`);
    }

    return irow;
  });
};

module.exports = { parseInvoiceRows };
