export interface MoneybirdConfig {
  client_id: string;
  client_secret: string;
  administration_id: string;
  default_financial_account_id?: string;
}

export interface MoneybirdToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}

export interface MoneybirdSalesInvoice {
  id: string;
  invoice_id: string;
  contact_id: string;
  total_unpaid: string;
  details_attributes?: MoneybirdInvoiceDetail[];
}

export interface MoneybirdFinancialAccount {
  id: string;
  name: string;
}

export interface MoneybirdPayment {
  id: string;
  price: string;
  payment_date: string;
  financial_account_id: string | null;
  manual_payment_action: string | null;
}

export interface MoneybirdInvoiceDetail {
  description: string;
  period: string;
  price: number;
  amount: number;
  tax_rate_id?: string;
}

export interface MoneybirdTaxRate {
  id: string;
  percentage: string;
  name: string;
}
