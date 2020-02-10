import { MoneyBirdRow } from "../MoneyBird/ModeyBirdRow.model";

const moment = require('moment');

export class InvoiceRow {
  _count: number;
  _fee: number;
  _date: Date;
  description: string;

  set count(count) {
    if (typeof count === 'string') {
      count = parseFloat(count.replace(',', '.'));
    }
    this._count = count;
  }

  get count() {
    return this._count;
  }

  set fee(fee) {
    if (typeof fee === 'string') {
      fee = parseFloat(fee.replace(/€ ?/, '').replace(',', '.'));
    }
    this._fee = fee;
  }

  get fee() {
    return this._fee;
  }

  set date(date) {
    if (date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/)) {
      this._date = moment.utc(date);
      return;
    }

    const nl = date.match(/^([0-9]{2})-([0-9]{2})-([0-9]{4})$/);
    if (nl) {
      this._date = moment.utc(`${nl[3]}-${nl[2]}-${nl[1]}`);
      return;
    }

    throw new Error(`Unexpected date format: ${date}`);
  }

  /**
   * @returns {Moment|null}
   */
  get date() {
    return this._date;
  }

  public static toMoneyBirdRow(invoiceRow: InvoiceRow): MoneyBirdRow {
    return InvoiceRowSerializer.toMoneyBirdRow(invoiceRow);
  }

  public static fromJson(json: any): InvoiceRow {
    return InvoiceRowSerializer.fromJson(json);
  }
}

class InvoiceRowSerializer {
  public static toMoneyBirdRow(invoiceRow: InvoiceRow): MoneyBirdRow {
    const moneyBirdRow = new MoneyBirdRow();
    moneyBirdRow.description = invoiceRow.description;
    moneyBirdRow.period = invoiceRow.date.format('YYYYMMDD..YYYYMMDD');
    moneyBirdRow.price = invoiceRow.fee;
    moneyBirdRow.amount = invoiceRow.count;
    return moneyBirdRow;
  }

  public static fromJson(json: any): InvoiceRow {
    const invoiceRow = new InvoiceRow();
    invoiceRow.count = json.count;
    invoiceRow.fee = json.fee;
    invoiceRow.date = json.date;
    invoiceRow.description = json.description;
    return invoiceRow;
  }
}
