import logger = require('../util/logger');
import { CommandLineArgs } from '../types/internal';
import { MoneybirdSalesInvoice } from '../types/moneybird';

const isUnpaid = (invoice: MoneybirdSalesInvoice): boolean => Number(invoice.total_unpaid) > 0;

const nextMonth = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
};

const getMoneybirdFilter = (args: CommandLineArgs): string | undefined => {
  if (args.month) {
    if (!args.month.match(/^[0-9]{4}-(?:0[1-9]|1[0-2])$/)) {
      throw new Error('Invalid --month, expected YYYY-MM');
    }
    const [start, end] = [`${args.month.replace('-', '')}01`, nextMonth(args.month).replaceAll('-', '')];
    return `state:all,period:${start}..${end}`;
  }
  return args.year ? `state:all,period:${args.year}0101..${args.year}1231` : undefined;
};

const formatHuman = (invoices: MoneybirdSalesInvoice[]): string => {
  if (invoices.length === 0) {
    return 'No invoices found';
  }

  const invoicePad = Math.max('invoice'.length, ...invoices.map(invoice => invoice.invoice_id.length));
  const datePad = 'date'.length;
  const unpaidPad = Math.max('unpaid'.length, ...invoices.map(invoice => invoice.total_unpaid.length));

  return [
    `${'invoice'.padEnd(invoicePad)}  ${'date'.padEnd(datePad)}  ${'unpaid'.padStart(unpaidPad)}  id`,
    ...invoices.map(invoice => `${invoice.invoice_id.padEnd(invoicePad)}  ${(invoice.invoice_date ?? '').padEnd(datePad)}  ${invoice.total_unpaid.padStart(unpaidPad)}  ${invoice.id}`)
  ].join('\n');
};

export const runListInvoices = async (args: CommandLineArgs, mb: any): Promise<void> => {
  const format = args.format ?? 'human';
  if (!['human', 'json'].includes(format)) {
    throw new Error('Invalid --format, expected human or json');
  }

  await mb.init();
  const invoices = ((await mb.getAllSalesInvoices(getMoneybirdFilter(args))) as MoneybirdSalesInvoice[])
    .filter(invoice => !args.unpaid || isUnpaid(invoice));

  logger.info(format === 'json' ? JSON.stringify(invoices, null, 2) : formatHuman(invoices));
};
