import fs = require('fs');
import path = require('path');
import logger = require('../util/logger');
import { CommandLineArgs } from '../types/internal';

export const runDownloadPdfs = async (args: CommandLineArgs, mb: any): Promise<void> => {
  if (Object.keys(args).filter(arg => arg !== 'command').length > 1) {
    logger.warn('dl-pdf found, ignoring other arguments');
  }

  logger.debug('Initializing Moneybird API for PDF download');
  await mb.init();
  const invoices = await mb.getAllSalesInvoices();
  logger.debug(`Found ${invoices.length} invoices to process`);

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    const outfile = path.resolve(__dirname, `../../data/invoices/${invoice.invoice_id}.pdf`);
    process.stdout.write(`${outfile} --> `);
    if (fs.existsSync(outfile)) {
      logger.info('Exists, skipping');
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
};
