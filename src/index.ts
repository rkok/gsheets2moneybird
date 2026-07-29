import config = require('config');
import fs = require('fs');
import path = require('path');
import logger = require('./util/logger');
import { parseArgs, usage, isCommand, CommandName } from './cli';
import { runDownloadPdfs } from './commands/downloadPdfs';
import { runInvoiceReport } from './commands/invoiceReport';
import { runRegisterPayment } from './commands/registerPayment';
import { AppConfig } from './types/config';
import { MoneybirdConfig } from './types/moneybird';

const files = {
  gsheetsToken: path.resolve(__dirname, '../config/gsheets-token.json'),
  moneybirdConfig: path.resolve(__dirname, '../config/moneybird.json'),
  moneybirdToken: path.resolve(__dirname, '../config/moneybird-token.json')
};

type Dependency = 'gsheets' | 'moneybird';

const needs: Record<CommandName, readonly Dependency[]> = {
  'create-invoice': ['gsheets', 'moneybird'],
  'dl-pdf': ['moneybird'],
  'register-payment': ['moneybird'],
  status: ['gsheets']
};

const checkFiles = (command: CommandName): void => {
  const commandNeeds = needs[command];

  if (commandNeeds.includes('gsheets') && !fs.existsSync(files.gsheetsToken)) {
    logger.error(`File 'config/gsheets-token.json' not found.`);
    logger.error(`  1. Obtain it by creating a service account on https://console.developers.google.com/apis/credentials`);
    logger.error(`  2. In the sheet(s), under 'Sharing', share access with the client_email listed within the token`);
    process.exit(1);
  }
  if (commandNeeds.includes('moneybird') && !fs.existsSync(files.moneybirdConfig)) {
    logger.error('config/moneybird.json not found');
    logger.error('  Create it, containing an object with: client_id, client_secret, administration_id }');
    logger.error('  The client_* details can be obtained through https://moneybird.com/user/applications');
    logger.error('  The administration id can be seen in the URL path when viewing the administration on moneybird.com');
    process.exit(1);
  }
  if (commandNeeds.includes('moneybird') && !fs.existsSync(files.moneybirdToken)) {
    logger.error('config/moneybird-token.json not found');
    logger.error('  Run: npm run mb-initial-token and follow the steps');
    process.exit(1);
  }
};

const main = async (): Promise<void> => {
  const args = parseArgs();

  if (args.debug) {
    logger.setDebug(true);
    logger.debug('Debug logging enabled');
  }

  if (args.help || !isCommand(args.command)) {
    logger.info(usage());
    return;
  }

  const command = args.command;
  checkFiles(command);

  if (command === 'status') {
    await runInvoiceReport(args, false, undefined, undefined);
    return;
  }

  const moneybirdConfig = require('../config/moneybird.json') as MoneybirdConfig;
  const mb = require('./api/moneybird')(moneybirdConfig);

  if (command === 'create-invoice') {
    await runInvoiceReport(args, true, mb, moneybirdConfig);
  } else if (command === 'dl-pdf') {
    await runDownloadPdfs(args, mb);
  } else if (command === 'register-payment') {
    await runRegisterPayment(args, mb, config as unknown as AppConfig, moneybirdConfig);
  }
};

main().catch((e: Error) => {
  logger.error(e.message);
  process.exit(1);
});
