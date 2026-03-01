import moment, { Moment } from 'moment';

interface MoneybirdRow {
  description: string;
  period: string;
  price: number;
  amount: number;
}

class InvoiceRow {
  _count!: number;
  _fee!: number;
  _date!: Moment;
  _description!: string;

  static create(count: string | number, fee: string | number, date: string, description: string): InvoiceRow {
    return new InvoiceRow(count, fee, date, description);
  }

  private constructor(count: string | number, fee: string | number, date: string, description: string) {
    this.count = count;
    this.fee = fee;
    this.date = date;
    this.description = description;
  }

  set count(count: string | number) {
    if (typeof count === 'string') {
      this._count = parseFloat(count.replace(',', '.'));
    } else {
      this._count = count;
    }
  }

  get count(): number {
    return this._count;
  }

  set fee(fee: string | number) {
    if (typeof fee === 'string') {
      this._fee = parseFloat(fee.replace(/€ ?/, '').replace(',', '.'));
    } else {
      this._fee = fee;
    }
  }

  get fee(): number {
    return this._fee;
  }

  set date(date: string) {
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

  get date(): Moment {
    return this._date;
  }

  set description(description: string) {
    this._description = description;
  }

  get description(): string {
    return this._description;
  }

  toMoneybirdRow(): MoneybirdRow {
    return {
      description: this.description,
      period: this._date.format('YYYYMMDD..YYYYMMDD'),
      price: this._fee,
      amount: this._count
    };
  }
}

export = InvoiceRow;
