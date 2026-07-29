export interface ParseInvoiceRowsOptions {
  defaultFee?: number;
  dateRange?: [Date, Date];
}

export interface SheetData {
  clientId: string;
  rows: string[][];
}

export interface CommandLineArgs {
  command?: string;
  clients?: string;
  'create-invoice'?: boolean;
  debug?: boolean;
  'dl-pdf'?: boolean;
  'financial-account-id'?: string;
  format?: string;
  help?: boolean;
  invoice?: string;
  'list-invoices'?: boolean;
  'manual-payment-action'?: string;
  month?: string;
  'payment-date'?: string;
  'register-payment'?: boolean;
  status?: boolean;
  test?: boolean;
  unpaid?: boolean;
  year?: number;
}
