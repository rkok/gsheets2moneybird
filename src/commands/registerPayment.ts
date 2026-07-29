import logger = require('../util/logger');
import registerInvoicePayment = require('../actions/registerInvoicePayment');
import { CommandLineArgs } from '../types/internal';
import { AppConfig } from '../types/config';
import { MoneybirdConfig } from '../types/moneybird';

export const runRegisterPayment = async (
  args: CommandLineArgs,
  mb: any,
  appConfig: AppConfig,
  moneybirdConfig: MoneybirdConfig
): Promise<void> => {
  if (!args.invoice) {
    throw new Error('Missing --invoice, e.g. --invoice 2026-0034');
  }
  if (!args['payment-date']) {
    throw new Error('Missing --payment-date, expected YYYY-MM-DD');
  }

  await mb.init();
  const payment = await registerInvoicePayment(mb, {
    invoice: args.invoice,
    paymentDate: args['payment-date'],
    manualPaymentAction: args['manual-payment-action'],
    financialAccountId: args['financial-account-id'] || appConfig.defaultFinancialAccountId || moneybirdConfig.default_financial_account_id
  });
  logger.info(`Registered payment ${payment.id} for invoice ${args.invoice}: ${payment.price} on ${payment.payment_date}`);
};
