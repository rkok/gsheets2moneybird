import config = require('config');
import fs = require('fs');
import path = require('path');
import cargs = require('command-line-args');
import cusage = require('command-line-usage');
import pMap = require('p-map');
import { parseInvoiceRows } from './sheetParser';
import parseCsv = require('./util/parsecsv');
import { addMonths } from 'date-fns';
import { CommandLineArgs, SheetData } from './types/internal';
import { AppConfig, ClientConfig } from './types/config';
import { MoneybirdConfig } from './types/moneybird';

// Dependency checks
if (!fs.existsSync(path.resolve(__dirname, '../config/gsheets-token.json'))) {
  console.error(`File 'config/gsheets-token.json' not found.`);
  console.error(`  1. Obtain it by creating a service account on https://console.developers.google.com/apis/credentials`);
  console.error(`  2. In the sheet(s), under 'Sharing', share access with the client_email listed within the token`);
  process.exit(1);
} else if (!fs.existsSync(path.resolve(__dirname, '../config/moneybird.json'))) {
  console.error('config/moneybird.json not found');
  console.error('  Create it, containing an object with: client_id, client_secret, administration_id, dummy_contact_id }');
  console.error('  The client_* details can be obtained through https://moneybird.com/user/applications');
  console.error('  The administration id can be seen in the URL path when viewing the administration on moneybird.com');
  console.error("  The dummy contact id can be seen in the URL path when viewing your dummy contact on moneybird.com. Create one if you don't have one yet.");
  process.exit(1);
} else if (!fs.existsSync(path.resolve(__dirname, '../config/moneybird-token.json'))) {
  console.error('config/moneybird-token.json not found');
  console.error('  Run: npm run mb-initial-token and follow the steps');
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
  { name: 'dl-pdf', type: Boolean },
  { name: 'help', type: Boolean },
  { name: 'month', type: String },
  { name: 'status', type: Boolean },
  { name: 'test', type: Boolean },
  { name: 'year', type: Number }
]) as CommandLineArgs;

if (args.help || !Object.keys(args).length || (!args['create-invoice'] && !args['dl-pdf'] && !args['status'])) {
  console.log(cusage([
    {
      content: "Usage: node ./ --create-invoice|--dl-pdf|--status [--clients ...] [--month YYYY-MM]"
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
    console.warn('--dl-pdf found, ignoring other arguments');
  }
  (async () => {
    await mb.init();
    const invoices = (await mb.getAllSalesInvoices());

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const outfile = path.resolve(__dirname, `../data/invoices/${invoice.invoice_id}.pdf`);
      process.stdout.write(`${outfile} --> `);
      if (fs.existsSync(outfile)) {
        console.log('Exists, skipping')
      } else {
        const pdfData = await mb.getSalesInvoicePdf(invoice.id);
        const outstream = fs.createWriteStream(outfile);
        pdfData.pipe(outstream);
        await new Promise<void>((resolve, reject) => {
          outstream.on('close', () => {
            console.log('Retrieved');
            resolve();
          });
          outstream.on('error', () => {
            console.log('Write error');
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
    console.error('Invalid --month, expected YYYY-MM');
    process.exit(1);
  }
  const start = new Date(`${args.month}-01T00:00:00.000Z`);
  dateRange = [start, addMonths(start, 1)];
} else if (args.year) {
  const start = new Date(`${args.year}-01-01T00:00:00.000Z`);
  dateRange = [start, addMonths(start, 12)];
}

(async () => {
  let totalMultiInvoiceFee = 0;
  const clientIds = Object.keys(clients);
  const clidPad = Math.max(...clientIds.map(c => c.length)) + 2;

  let sheets: SheetData[] = [];
  if (args.test) {
    sheets = [
      { clientId: 'foo', rows: parseCsv(fs.readFileSync(__dirname + '/../test/test.csv').toString()) }
    ];
  } else {
    sheets = await pMap(clientIds, async (id: string): Promise<SheetData> => ({
      clientId: id,
      rows: await gsheets.getSheet(clients[id].sheetId)
    }), { concurrency: 2 })
  }

  for (let i = 0; i < sheets.length; i++) {
    const { clientId, rows } = sheets[i];
    const client = clients[clientId];

    const parseOpts = { defaultFee: client?.defaultFee ?? configTyped.defaultFee, dateRange };
    const invoiceRows = parseInvoiceRows(rows, parseOpts);

    const totalInvoiceFee = invoiceRows.reduce((total, irow) => {
      if (isNaN(Number(irow.fee))) {
        console.error(`[!] Skipping row with invalid count or fee: "${irow.description}"`)
        return total;
      }
      return total + irow.count! * irow.fee!;
    }, 0);
    const totalInvoiceFeeFmt = new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      useGrouping: false
    }).format(totalInvoiceFee).replace('€', ' ').padStart(11);
    console.log(`${clientId.padEnd(clidPad, ' ')} - Total: €${totalInvoiceFeeFmt}`);

    totalMultiInvoiceFee += totalInvoiceFee;

    if (!args['create-invoice']) {
      continue;
    } else if (invoiceRows.length === 0) {
      console.log('Nothing to bill to client. Skipping invoice creation');
      continue;
    }

    let includeVat = true; // Default: include VAT
    if (client.hasOwnProperty('includeVat')) {
      includeVat = client.includeVat!; // VAT override per client
    } else if (configTyped.hasOwnProperty('includeVat')) {
      includeVat = configTyped.includeVat!; // Global VAT setting
    }

    console.log('Creating invoice ...');
    await mb.init();
    const invoiceId = await mb.createSalesInvoice(invoiceRows, includeVat);
    console.log(`Created invoice: https://moneybird.com/${mbcfg.administration_id}/sales_invoices/${invoiceId}`);
  }

  const totalMultiInvoiceFeeFmt = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    useGrouping: false
  }).format(totalMultiInvoiceFee).replace('€', ' ').padStart(11);
  console.log(`${''.padEnd(clidPad, '#')}######### €${totalMultiInvoiceFeeFmt}`);
})();
