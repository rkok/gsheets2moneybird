import createMoneybirdAPI = require('../api/moneybird');
import InvoiceRow = require('../model/InvoiceRow');
import logger = require('../util/logger');
import { MoneybirdConfig } from '../types/moneybird';

const mbcfg = require('../../config/moneybird.json') as MoneybirdConfig;
const mb = createMoneybirdAPI(mbcfg);

const contactId = process.argv[2];
if (!contactId) {
  logger.error('Usage: npm run mb-create-test-invoice <contact_id>');
  process.exit(1);
}

mb.init().then(async () => {
  const rows: InvoiceRow[] = [
    InvoiceRow.create(1, 12, '2019-01-01', 'Test test')
  ];
  const invoiceId = await mb.createSalesInvoice(rows, true, contactId);
  logger.info(`Created invoice: ${invoiceId}`);
});
