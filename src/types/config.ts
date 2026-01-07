// TODO: The 'config' module doesn't have official TypeScript types.
// We've created custom types, but they may not cover all edge cases.
// Consider migrating to a TypeScript-native config solution in the future.

export interface ClientConfig {
  sheetId: string;
  defaultFee?: number;
  includeVat?: boolean;
}

export interface ColumnNames {
  date: string;
  numberOfHours: string;
  description: string;
  invoiceNumber: string;
  hourlyRate: string;
  customer: string;
}

export interface AppConfig {
  clients: Record<string, ClientConfig>;
  columnNames: ColumnNames;
  defaultFee?: number;
  includeVat?: boolean;
}
