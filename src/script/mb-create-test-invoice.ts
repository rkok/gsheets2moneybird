import createMoneybirdAPI = require('../api/moneybird');
import InvoiceRow = require('../model/InvoiceRow');
import { MoneybirdConfig } from '../types/moneybird';

const mbcfg = require('../../config/moneybird.json') as MoneybirdConfig;
const mb = createMoneybirdAPI(mbcfg);

const contactId = process.argv[2];
if (!contactId) {
  console.error('Usage: npm run mb-create-test-invoice <contact_id>');
  process.exit(1);
}

mb.init().then(async () => {
  const rows: InvoiceRow[] = [
    InvoiceRow.create(1, 12, '2019-01-01', 'Test test')
  ];
  const invoiceId = await mb.createSalesInvoice(rows, true, contactId);
  console.log(`Created invoice: ${invoiceId}`);
});
