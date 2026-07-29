import logger = require('../util/logger');
import { MoneybirdFinancialAccount, MoneybirdPayment, MoneybirdSalesInvoice } from '../types/moneybird';

interface MoneybirdApi {
  getSalesInvoiceByInvoiceId(invoiceId: string): Promise<MoneybirdSalesInvoice>;
  getFinancialAccounts(): Promise<MoneybirdFinancialAccount[]>;
  createSalesInvoicePayment(salesInvoiceId: string, payment: {
    payment_date: string;
    price: string;
    manual_payment_action?: string;
    financial_account_id?: string;
  }): Promise<MoneybirdPayment>;
}

interface RegisterInvoicePaymentArgs {
  invoice: string;
  paymentDate: string;
  manualPaymentAction?: string;
  financialAccountId?: string;
}

const resolveFinancialAccountId = async (mb: MoneybirdApi, givenId?: string): Promise<string> => {
  if (givenId) {
    return givenId;
  }

  const accounts = await mb.getFinancialAccounts();
  if (accounts.length === 1) {
    logger.info(`Using financial account: ${accounts[0].name} (${accounts[0].id})`);
    return accounts[0].id;
  }
  if (accounts.length === 0) {
    throw new Error('No financial accounts found in Moneybird');
  }

  const accountList = accounts.map(a => `- ${a.name} (${a.id})`).join('\n');
  throw new Error(`Multiple financial accounts found; pass --financial-account-id.\n${accountList}`);
};

const assertPaymentDate = (paymentDate: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    throw new Error('Invalid --payment-date, expected YYYY-MM-DD');
  }
};

const registerInvoicePayment = async (mb: MoneybirdApi, args: RegisterInvoicePaymentArgs): Promise<MoneybirdPayment> => {
  assertPaymentDate(args.paymentDate);

  const invoice = await mb.getSalesInvoiceByInvoiceId(args.invoice);
  const price = invoice.total_unpaid;
  if (!price || Number(price) <= 0) {
    throw new Error(`Invoice ${args.invoice} has no unpaid amount`);
  }

  const manualPaymentAction = args.manualPaymentAction || 'private_payment';
  const financialAccountId = await resolveFinancialAccountId(mb, args.financialAccountId);

  return mb.createSalesInvoicePayment(invoice.id, {
    payment_date: args.paymentDate,
    price,
    manual_payment_action: manualPaymentAction,
    financial_account_id: financialAccountId
  });
};

export = registerInvoicePayment;
