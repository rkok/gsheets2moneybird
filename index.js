const config = require('./config/config.json');
const fs = require('fs');
const path = require('path');
const parser = require('./src/sheetParser');

if (process.argv.length < 3) {
  console.log('Usage: node ./ <clientname>');
  process.exit(1);
}
const clientId = process.argv[2];
const client = config.clients[clientId];
if (!client) {
  console.error(`Invalid client name given`);
  process.exit(1);
}

console.log(`Client: ${clientId}`);

if (!fs.existsSync(path.resolve(__dirname, './config/gsheets-token.json'))) {
  console.error(`File 'config/gsheets-token.json' not found.`);
  console.error(`  1. Obtain it by creating a service account on https://console.developers.google.com/apis/credentials`);
  console.error(`  2. In the sheet(s), under 'Sharing', share access with the client_email listed within the token`);
  process.exit(1);
}

const token = require('./config/gsheets-token.json');
const sheets = require('./src/api/gsheets')(token);

if (!fs.existsSync(path.resolve(__dirname, './config/moneybird.json'))) {
  console.error('config/moneybird.json not found');
  console.error('  Create it, containing an object with: client_id, client_secret, administration_id, dummy_contact_id }');
  console.error('  The client_* details can be obtained through https://moneybird.com/user/applications');
  console.error('  The administration id can be seen in the URL path when viewing the administration on moneybird.com');
  console.error('  The dummy contact id can be seen in the URL path when viewing your dummy contact on moneybird.com');
  process.exit(1);
}

const mbcfg = require('./config/moneybird');

if (!fs.existsSync(path.resolve(__dirname, './config/moneybird-token.json'))) {
  console.error('config/moneybird-token.json not found');
  console.error('  Run: node src/scripts/mb-initial-token.js and follow the steps');
  process.exit(1);
}

const mb = require('./src/api/moneybird')(mbcfg);

(async () => {
  const rows = await sheets.getSheet(client.sheetId);
  const invoiceRows = parser.parseInvoiceRows(rows, config.defaultFee);

  const totalInvoiceFee = invoiceRows.reduce((total, irow) => {
    return total + irow.count * irow.fee;
  }, 0);
  const totalInvoiceFeeFmt = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(totalInvoiceFee);
  console.log(`Total outstanding: ${totalInvoiceFeeFmt}`);

  if (invoiceRows.length === 0) {
    console.log('Nothing to bill to client. Exiting.');
    process.exit(0);
  }

  console.log('Creating invoice ...');
  await mb.init();
  const includeVat = client.hasOwnProperty('includeVat') ? client.includeVat : true;
  const invoiceId = await mb.createSalesInvoice(invoiceRows, includeVat);
  console.log(`Created invoice: https://moneybird.com/${mbcfg.administration_id}/sales_invoices/${invoiceId}`);
})();
