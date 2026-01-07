import createMoneybirdAPI = require('../api/moneybird');
import InvoiceRow = require('../model/InvoiceRow');
import { MoneybirdConfig } from '../types/moneybird';

const mbcfg = require('../../config/moneybird.json') as MoneybirdConfig;
const mb = createMoneybirdAPI(mbcfg);

mb.init().then(async () => {
  const rows: InvoiceRow[] = [
    InvoiceRow.create(1, 12, '2019-01-01', 'Test test')
  ];
  const invoiceId = await mb.createSalesInvoice(rows, true);
  console.log(`Created invoice: ${invoiceId}`);
});
