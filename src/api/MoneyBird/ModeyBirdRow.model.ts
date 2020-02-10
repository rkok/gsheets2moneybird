import { InvoiceRow } from "../GoogleSheets/InvoiceRow.model";

export class MoneyBirdRow {
    description: string;
    period: Date;
    price: number;
    amount: number;
}

class MoneyBirdSerializer {
    public static fromInvoiceRow(invoiceRow: InvoiceRow) {
        const moneyBird = new MoneyBirdRow();
        moneyBird.description = invoiceRow.description;
        moneyBird.period = invoiceRow.date.format('YYYYMMDD..YYYYMMDD');
    }
}
