import config = require('config');
import fs = require('fs');
import path = require('path');
import pMap = require('p-map');
import parseCsv = require('../util/parsecsv');
import logger = require('../util/logger');
import { parseInvoiceRows } from '../sheetParser';
import { addMonths } from 'date-fns';
import { CommandLineArgs, SheetData } from '../types/internal';
import { AppConfig, ClientConfig } from '../types/config';
import { MoneybirdConfig } from '../types/moneybird';

const formatEuro = (amount: number): string => new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: false
}).format(amount).replace('€', ' ').padStart(11);

export const runInvoiceReport = async (
  args: CommandLineArgs,
  createInvoices: boolean,
  mb?: any,
  moneybirdConfig?: MoneybirdConfig
): Promise<void> => {
  const appConfig = config as unknown as AppConfig;
  const token = require('../../config/gsheets-token.json');
  const gsheets = require('../api/gsheets')(token);

  let clients: Record<string, ClientConfig> = {};
  if (args.clients) {
    args.clients.split(',').forEach((clientId: string) => {
      if (!appConfig.clients[clientId]) {
        throw new Error(`Client does not exist: ${clientId}`);
      }
      clients[clientId] = appConfig.clients[clientId];
    });
  } else {
    clients = appConfig.clients;
  }

  let dateRange: [Date, Date] | undefined = undefined;
  if (args.month) {
    if (!args.month.match(/^[0-9]{4}-(?:0[1-9]|1[0-2])$/)) {
      throw new Error('Invalid --month, expected YYYY-MM');
    }
    const start = new Date(`${args.month}-01T00:00:00.000Z`);
    dateRange = [start, addMonths(start, 1)];
    logger.debug(`Date range set to: ${start.toISOString()} - ${addMonths(start, 1).toISOString()}`);
  } else if (args.year) {
    const start = new Date(`${args.year}-01-01T00:00:00.000Z`);
    dateRange = [start, addMonths(start, 12)];
    logger.debug(`Date range set to year ${args.year}`);
  }

  let totalMultiInvoiceFee = 0;
  const clientIds = Object.keys(clients);
  const clidPad = Math.max(...clientIds.map(c => c.length)) + 2;
  logger.debug(`Processing ${clientIds.length} client(s): ${clientIds.join(', ')}`);

  let sheets: SheetData[] = [];
  if (args.test) {
    logger.debug('Using test CSV data');
    sheets = [
      { clientId: 'foo', rows: parseCsv(fs.readFileSync(path.resolve(__dirname, '../../test/test.csv')).toString()) }
    ];
  } else {
    logger.debug('Fetching sheets from Google Sheets');
    sheets = await pMap(clientIds, async (id: string): Promise<SheetData> => {
      logger.debug(`Fetching sheet for client: ${id} (sheetId: ${clients[id].sheetId})`);
      const rows = await gsheets.getSheet(clients[id].sheetId);
      logger.debug(`Retrieved ${rows.length} rows for client: ${id}`);
      return { clientId: id, rows };
    }, { concurrency: 2 });
  }

  for (let i = 0; i < sheets.length; i++) {
    const { clientId, rows } = sheets[i];
    const client = clients[clientId];

    const parseOpts = { defaultFee: client?.defaultFee ?? appConfig.defaultFee, dateRange };
    logger.debug(`Parsing invoice rows for client: ${clientId}`);
    let invoiceRows;
    try {
      invoiceRows = parseInvoiceRows(rows, parseOpts);
    } catch (e) {
      const error = e as Error;
      throw new Error(`[${clientId}] ${error.message}`);
    }
    logger.debug(`Parsed ${invoiceRows.length} invoice rows for client: ${clientId}`);

    const totalInvoiceFee = invoiceRows.reduce((total, irow) => {
      if (isNaN(Number(irow.fee))) {
        logger.error(`[!] Skipping row with invalid count or fee: "${irow.description}"`);
        return total;
      }
      return total + irow.count! * irow.fee!;
    }, 0);
    logger.info(`${clientId.padEnd(clidPad, ' ')} - Total: €${formatEuro(totalInvoiceFee)}`);

    totalMultiInvoiceFee += totalInvoiceFee;

    if (!createInvoices) {
      continue;
    } else if (invoiceRows.length === 0) {
      logger.info('Nothing to bill to client. Skipping invoice creation');
      continue;
    }

    let includeVat = true;
    if (client.hasOwnProperty('includeVat')) {
      includeVat = client.includeVat!;
    } else if (appConfig.hasOwnProperty('includeVat')) {
      includeVat = appConfig.includeVat!;
    }
    logger.debug(`VAT setting for client ${clientId}: ${includeVat ? 'included' : 'excluded'}`);

    if (!client.mbContactId) {
      logger.error(`No mbContactId configured for client '${clientId}'. Skipping invoice creation.`);
      continue;
    }

    if (!mb || !moneybirdConfig) {
      throw new Error('Moneybird API is required to create invoices');
    }

    logger.info('Creating invoice ...');
    logger.debug('Initializing Moneybird API');
    await mb.init();
    logger.debug(`Creating sales invoice for contact: ${client.mbContactId}`);
    const invoiceId = await mb.createSalesInvoice(invoiceRows, includeVat, client.mbContactId);
    logger.info(`Created invoice: https://moneybird.com/${moneybirdConfig.administration_id}/sales_invoices/${invoiceId}`);
  }

  logger.info(`${''.padEnd(clidPad, '#')}######### €${formatEuro(totalMultiInvoiceFee)}`);
};
