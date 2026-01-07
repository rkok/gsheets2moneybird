import moment, { Moment } from 'moment';

interface MoneybirdRow {
  description: string;
  period: string;
  price: number;
  amount: number;
}

class InvoiceRow {
  _count: number | null = null;
  _fee: number | null = null;
  _date: Moment | null = null;
  description: string | null = null;

  static create(count: string | number, fee: string | number, date: string, description: string): InvoiceRow {
    const row = new InvoiceRow();
    row.count = count;
    row.fee = fee;
    row.date = date;
    row.description = description;
    return row;
  }

  set count(count: string | number) {
    if (typeof count === 'string') {
      this._count = parseFloat(count.replace(',', '.'));
    } else {
      this._count = count;
    }
  }

  get count(): number | null {
    return this._count;
  }

  set fee(fee: string | number) {
    if (typeof fee === 'string') {
      this._fee = parseFloat(fee.replace(/€ ?/, '').replace(',', '.'));
    } else {
      this._fee = fee;
    }
  }

  get fee(): number | null {
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

  /**
   * @returns {Moment|null}
   */
  get date(): Moment | null {
    return this._date;
  }

  toMoneybirdRow(): MoneybirdRow {
    // TODO: Add null checks - this method can crash if date, fee, or count are null
    return {
      description: this.description!,
      period: this._date!.format('YYYYMMDD..YYYYMMDD'),
      price: this._fee!,
      amount: this._count!
    };
  }
}

export = InvoiceRow;
