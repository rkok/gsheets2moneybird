import InvoiceRow = require('./model/InvoiceRow');
import { isWithinInterval } from 'date-fns';
import config = require('config');
import { ParseInvoiceRowsOptions } from './types/internal';
import { AppConfig } from './types/config';

const REQUIRED_COLS = ['count', 'date', 'description', 'invoiceNo'] as const;

interface ColumnMapping {
  count: number | null;
  fee: number | null;
  date: number | null;
  client: number | null;
  description: number | null;
  invoiceNo: number | null;
}

const parseDate = (date: string): Date => {
  const split = date.split('-');
  if (split[0].length === 4) {
    return new Date(`${date}T00:00:00.000Z`); // Assume YYYY-MM-DD
  }
  const [d, m, y] = split; // Assume DD-MM-YYYY
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
};

/**
 * @param rows
 * @param opts
 * @returns {InvoiceRow[]}
 */
export function parseInvoiceRows(rows: string[][], opts: ParseInvoiceRowsOptions): InvoiceRow[] {
  if (!rows.length) {
    throw new Error(`No rows in the given sheet`);
  }

  const cols: ColumnMapping = {
    count: null,
    fee: null,
    date: null,
    client: null,
    description: null,
    invoiceNo: null
  };

  const configTyped = config as unknown as AppConfig;

  rows[0].forEach((col: string, nc: number) => {
    if (col === configTyped.columnNames.numberOfHours) cols.count = nc;
    else if (col === configTyped.columnNames.hourlyRate) cols.fee = nc;
    else if (col === configTyped.columnNames.date) cols.date = nc;
    else if (col === configTyped.columnNames.customer) cols.client = nc;
    else if (col === configTyped.columnNames.invoiceNumber) cols.invoiceNo = nc;
    else if (col === configTyped.columnNames.description) cols.description = nc;
  });

  if (!REQUIRED_COLS.every(col => cols[col] !== null)) {
    throw new Error(`Not all necessary columns are included in the sheet; `
      + REQUIRED_COLS.map(col => `${col}=${cols[col]}`).join(', '));
  }

  // Filter out rows we don't need
  // Column header row
  rows.shift();

  // No 'count' filled in
  let filteredRows = rows.filter(row => row[cols.count!] && row[cols.count!].length > 0);

  if (opts.dateRange) {
    // Not in date range
    const [start, end] = opts.dateRange;
    filteredRows = filteredRows.filter(row => {
      if (!row[cols.date!]) {
        console.error('Skipping row due to missing date');
        // TODO: Fixed indentation (was using tab character)
        return false;
      }
      return isWithinInterval(parseDate(row[cols.date!]), { start, end });
    });
  } else {
    // Already have an invoice number
    filteredRows = filteredRows.filter(row => !row[cols.invoiceNo!] || !row[cols.invoiceNo!].length);
  }

  return filteredRows.map((row: string[], nr: number) => {
    const irow = new InvoiceRow();
    irow.count = row[cols.count!];
    irow.fee = cols.fee !== null && row[cols.fee] !== undefined && row[cols.fee].length > 0
      ? Number(row[cols.fee].replace(/€\s?/, '').replace(',', '.'))
      : opts.defaultFee!;

    let desc = '';
    if (cols.client && row[cols.client]) {
      desc += `${row[cols.client]}: `;
    }
    desc += row[cols.description!];
    irow.description = desc;

    try {
      irow.date = row[cols.date!];
    } catch (e) {
      const error = e as Error;
      throw new Error(`Error mapping new invoice row ${nr}: ${error.message}  - row data: ${JSON.stringify(row)}`);
    }

    return irow;
  });
}

module.exports = { parseInvoiceRows };
