const moment = require('moment');

class InvoiceRow {
  _count = null;
  _fee = null;
  _date = null;
  description = null;

  static create(count, fee, date, description) {
    const row = new InvoiceRow();
    row.count = count;
    row.fee = fee;
    row.date = date;
    row.description = description;
    return row;
  }

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

  toMoneybirdRow() {
    return {
      description: this.description,
      period: this.date.format('YYYYMMDD..YYYYMMDD'),
      price: this.fee,
      amount: this.count
    };
  }
}

module.exports = InvoiceRow;
