import config = require('config');
import fs = require('fs');
import path = require('path');
import cargs = require('command-line-args');
import cusage = require('command-line-usage');
import pMap = require('p-map');
import parseCsv = require('./util/parsecsv');
import logger = require('./util/logger');
import { parseInvoiceRows } from './sheetParser';
import { addMonths } from 'date-fns';
import { CommandLineArgs, SheetData } from './types/internal';
import { AppConfig, ClientConfig } from './types/config';
import { MoneybirdConfig } from './types/moneybird';

// Dependency checks
if (!fs.existsSync(path.resolve(__dirname, '../config/gsheets-token.json'))) {
  logger.error(`File 'config/gsheets-token.json' not found.`);
  logger.error(`  1. Obtain it by creating a service account on https://console.developers.google.com/apis/credentials`);
  logger.error(`  2. In the sheet(s), under 'Sharing', share access with the client_email listed within the token`);
  process.exit(1);
} else if (!fs.existsSync(path.resolve(__dirname, '../config/moneybird.json'))) {
  logger.error('config/moneybird.json not found');
  logger.error('  Create it, containing an object with: client_id, client_secret, administration_id }');
  logger.error('  The client_* details can be obtained through https://moneybird.com/user/applications');
  logger.error('  The administration id can be seen in the URL path when viewing the administration on moneybird.com');
  process.exit(1);
} else if (!fs.existsSync(path.resolve(__dirname, '../config/moneybird-token.json'))) {
  logger.error('config/moneybird-token.json not found');
  logger.error('  Run: npm run mb-initial-token and follow the steps');
  process.exit(1);
}

const token = require('../config/gsheets-token.json');
const gsheets = require('./api/gsheets')(token);
const mbcfg = require('../config/moneybird.json') as MoneybirdConfig;
const mb = require('./api/moneybird')(mbcfg);

// CLI arguments check
const args = cargs([
  { name: 'clients' },
  { name: 'create-invoice', type: Boolean, defaultOption: false },
  { name: 'debug', type: Boolean },
  { name: 'dl-pdf', type: Boolean },
  { name: 'help', type: Boolean },
  { name: 'month', type: String },
  { name: 'status', type: Boolean },
  { name: 'test', type: Boolean },
  { name: 'year', type: Number }
]) as CommandLineArgs;

// Enable debug logging if --debug flag is set
if (args.debug) {
  logger.setDebug(true);
  logger.debug('Debug logging enabled');
}

if (args.help || !Object.keys(args).length || (!args['create-invoice'] && !args['dl-pdf'] && !args['status'])) {
  logger.info(cusage([
    {
      content: `Usage: gs2mb --create-invoice|--dl-pdf|--status [--clients ...] [--month YYYY-MM]`
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'clients',
          typeLabel: '{underline client1[,client2,...]}',
          description: 'Filter names of clients to include'
        },
        {
          name: 'create-invoice',
          type: Boolean,
          description: 'Create invoices in MoneyBird'
        },
        {
          name: 'debug',
          type: Boolean,
          description: 'Enable debug logging'
        },
        {
          name: 'dl-pdf',
          type: Boolean,
          description: 'Download unpaid invoice PDFs'
        },
        {
          name: 'help',
          type: Boolean,
          description: 'Print this usage guide.'
        },
        {
          name: 'month',
          type: String,
          description: 'Year and month to calculate revenue for. Will INCLUDE hours which are already invoiced.'
        },
        {
          name: 'status',
          type: Boolean,
          description: 'Display outstanding hours (implicit in --create-invoice)'
        },
        {
          name: 'test',
          type: Boolean,
          description: 'Use data from test csv instead of Google Sheets'
        },
        {
          name: 'year',
          type: Number
        }
      ]
    }
  ]));
  process.exit(0);
}

if (args['dl-pdf']) {
  if (Object.keys(args).length > 1) {
    logger.warn('--dl-pdf found, ignoring other arguments');
  }
  (async () => {
    logger.debug('Initializing Moneybird API for PDF download');
    await mb.init();
    const invoices = (await mb.getAllSalesInvoices());
    logger.debug(`Found ${invoices.length} invoices to process`);

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const outfile = path.resolve(__dirname, `../data/invoices/${invoice.invoice_id}.pdf`);
      process.stdout.write(`${outfile} --> `);
      if (fs.existsSync(outfile)) {
        logger.info('Exists, skipping')
      } else {
        logger.debug(`Downloading invoice ${invoice.id}`);
        const pdfData = await mb.getSalesInvoicePdf(invoice.id);
        const outstream = fs.createWriteStream(outfile);
        pdfData.pipe(outstream);
        await new Promise<void>((resolve, reject) => {
          outstream.on('close', () => {
            logger.info('Retrieved');
            resolve();
          });
          outstream.on('error', () => {
            logger.error('Write error');
            reject();
          });
        });
      }
    }
    process.exit(0);
  })();
}

const configTyped = config as unknown as AppConfig;

let clients: Record<string, ClientConfig> = {};
if (args.clients) {
  args.clients.split(',').forEach((clientId: string) => {
    if (!configTyped.clients[clientId]) {
      throw new Error(`Client does not exist: ${clientId}`);
    }
    clients[clientId] = configTyped.clients[clientId];
  });
} else {
  clients = configTyped.clients;
}

let dateRange: [Date, Date] | undefined = undefined;
if (args.month) {
  if (!args.month.match(/^[0-9]{4}-(?:0[1-9]|1[0-2])$/)) {
    logger.error('Invalid --month, expected YYYY-MM');
    process.exit(1);
  }
  const start = new Date(`${args.month}-01T00:00:00.000Z`);
  dateRange = [start, addMonths(start, 1)];
  logger.debug(`Date range set to: ${start.toISOString()} - ${addMonths(start, 1).toISOString()}`);
} else if (args.year) {
  const start = new Date(`${args.year}-01-01T00:00:00.000Z`);
  dateRange = [start, addMonths(start, 12)];
  logger.debug(`Date range set to year ${args.year}`);
}

(async () => {
  let totalMultiInvoiceFee = 0;
  const clientIds = Object.keys(clients);
  const clidPad = Math.max(...clientIds.map(c => c.length)) + 2;
  logger.debug(`Processing ${clientIds.length} client(s): ${clientIds.join(', ')}`);

  let sheets: SheetData[] = [];
  if (args.test) {
    logger.debug('Using test CSV data');
    sheets = [
      { clientId: 'foo', rows: parseCsv(fs.readFileSync(__dirname + '/../test/test.csv').toString()) }
    ];
  } else {
    logger.debug('Fetching sheets from Google Sheets');
    sheets = await pMap(clientIds, async (id: string): Promise<SheetData> => {
      logger.debug(`Fetching sheet for client: ${id} (sheetId: ${clients[id].sheetId})`);
      const rows = await gsheets.getSheet(clients[id].sheetId);
      logger.debug(`Retrieved ${rows.length} rows for client: ${id}`);
      return { clientId: id, rows };
    }, { concurrency: 2 })
  }

  for (let i = 0; i < sheets.length; i++) {
    const { clientId, rows } = sheets[i];
    const client = clients[clientId];

    const parseOpts = { defaultFee: client?.defaultFee ?? configTyped.defaultFee, dateRange };
    logger.debug(`Parsing invoice rows for client: ${clientId}`);
    const invoiceRows = parseInvoiceRows(rows, parseOpts);
    logger.debug(`Parsed ${invoiceRows.length} invoice rows for client: ${clientId}`);

    const totalInvoiceFee = invoiceRows.reduce((total, irow) => {
      if (isNaN(Number(irow.fee))) {
        logger.error(`[!] Skipping row with invalid count or fee: "${irow.description}"`)
        return total;
      }
      return total + irow.count! * irow.fee!;
    }, 0);
    const totalInvoiceFeeFmt = new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      useGrouping: false
    }).format(totalInvoiceFee).replace('€', ' ').padStart(11);
    logger.info(`${clientId.padEnd(clidPad, ' ')} - Total: €${totalInvoiceFeeFmt}`);

    totalMultiInvoiceFee += totalInvoiceFee;

    if (!args['create-invoice']) {
      continue;
    } else if (invoiceRows.length === 0) {
      logger.info('Nothing to bill to client. Skipping invoice creation');
      continue;
    }

    let includeVat = true; // Default: include VAT
    if (client.hasOwnProperty('includeVat')) {
      includeVat = client.includeVat!; // VAT override per client
    } else if (configTyped.hasOwnProperty('includeVat')) {
      includeVat = configTyped.includeVat!; // Global VAT setting
    }
    logger.debug(`VAT setting for client ${clientId}: ${includeVat ? 'included' : 'excluded'}`);

    if (!client.mbContactId) {
      logger.error(`No mbContactId configured for client '${clientId}'. Skipping invoice creation.`);
      continue;
    }

    logger.info('Creating invoice ...');
    logger.debug(`Initializing Moneybird API`);
    await mb.init();
    logger.debug(`Creating sales invoice for contact: ${client.mbContactId}`);
    const invoiceId = await mb.createSalesInvoice(invoiceRows, includeVat, client.mbContactId);
    logger.info(`Created invoice: https://moneybird.com/${mbcfg.administration_id}/sales_invoices/${invoiceId}`);
  }

  const totalMultiInvoiceFeeFmt = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    useGrouping: false
  }).format(totalMultiInvoiceFee).replace('€', ' ').padStart(11);
  logger.info(`${''.padEnd(clidPad, '#')}######### €${totalMultiInvoiceFeeFmt}`);
})();
