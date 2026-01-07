export interface ParseInvoiceRowsOptions {
  defaultFee?: number;
  dateRange?: [Date, Date];
}

export interface SheetData {
  clientId: string;
  rows: string[][];
}

export interface CommandLineArgs {
  clients?: string;
  'create-invoice'?: boolean;
  'dl-pdf'?: boolean;
  help?: boolean;
  month?: string;
  status?: boolean;
  test?: boolean;
  year?: number;
}
