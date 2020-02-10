const mbcfg = require('../../config/moneybird');
const mb = require('../api/moneybird')(mbcfg);
const InvoiceRow = require('../model/InvoiceRow');

mb.init().then(async () => {
  const rows = [
    InvoiceRow.create(1, 12, '2019-01-01', 'Test test')
  ];
  const invoiceId = await mb.createSalesInvoice(rows);
  console.log(`Created invoice: ${invoiceId}`);
});
