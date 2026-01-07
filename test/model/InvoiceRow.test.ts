import InvoiceRow = require('../../src/model/InvoiceRow');

describe('InvoiceRow', () => {
  describe('date parsing', () => {
    it('parses YYYY-MM-DD date format', () => {
      const row = new InvoiceRow();
      row.date = '2022-01-15';
      expect(row.date!.format('YYYY-MM-DD')).toBe('2022-01-15');
    });

    it('parses DD-MM-YYYY date format', () => {
      const row = new InvoiceRow();
      row.date = '15-01-2022';
      expect(row.date!.format('YYYY-MM-DD')).toBe('2022-01-15');
    });

    it('throws on invalid date format', () => {
      const row = new InvoiceRow();
      expect(() => { row.date = 'invalid'; }).toThrow('Unexpected date format');
    });

    it('throws on partial date format', () => {
      const row = new InvoiceRow();
      expect(() => { row.date = '2022-01'; }).toThrow('Unexpected date format');
    });
  });

  describe('fee parsing', () => {
    it('parses fee with € symbol and space', () => {
      const row = new InvoiceRow();
      row.fee = '€ 50';
      expect(row.fee).toBe(50);
    });

    it('parses fee with € symbol without space', () => {
      const row = new InvoiceRow();
      row.fee = '€50';
      expect(row.fee).toBe(50);
    });

    it('parses fee with comma decimal', () => {
      const row = new InvoiceRow();
      row.fee = '45,50';
      expect(row.fee).toBe(45.5);
    });

    it('parses fee with € and comma decimal', () => {
      const row = new InvoiceRow();
      row.fee = '€45,50';
      expect(row.fee).toBe(45.5);
    });

    it('parses integer fee as string', () => {
      const row = new InvoiceRow();
      row.fee = '30';
      expect(row.fee).toBe(30);
    });

    it('accepts numeric fee directly', () => {
      const row = new InvoiceRow();
      row.fee = 75;
      expect(row.fee).toBe(75);
    });
  });

  describe('count parsing', () => {
    it('parses count with comma decimal', () => {
      const row = new InvoiceRow();
      row.count = '2,5';
      expect(row.count).toBe(2.5);
    });

    it('parses integer count as string', () => {
      const row = new InvoiceRow();
      row.count = '8';
      expect(row.count).toBe(8);
    });

    it('accepts numeric count directly', () => {
      const row = new InvoiceRow();
      row.count = 3.5;
      expect(row.count).toBe(3.5);
    });

    it('parses realistic fractional hours from fixtures', () => {
      const row1 = new InvoiceRow();
      row1.count = '0.1667';
      expect(row1.count).toBe(0.1667);

      const row2 = new InvoiceRow();
      row2.count = '0.083';
      expect(row2.count).toBe(0.083);

      const row3 = new InvoiceRow();
      row3.count = '0.665';
      expect(row3.count).toBe(0.665);
    });

    it('parses various hour formats from real data', () => {
      const row1 = new InvoiceRow();
      row1.count = '4.5';
      expect(row1.count).toBe(4.5);

      const row2 = new InvoiceRow();
      row2.count = '0,25';
      expect(row2.count).toBe(0.25);

      const row3 = new InvoiceRow();
      row3.count = '1,75';
      expect(row3.count).toBe(1.75);
    });
  });

  describe('create() factory', () => {
    it('creates InvoiceRow with all parsed values', () => {
      const row = InvoiceRow.create('2,5', '€45,50', '2022-01-15', 'Test description');
      expect(row.count).toBe(2.5);
      expect(row.fee).toBe(45.5);
      expect(row.date!.format('YYYY-MM-DD')).toBe('2022-01-15');
      expect(row.description).toBe('Test description');
    });
  });

  describe('toMoneybirdRow()', () => {
    it('transforms to Moneybird format', () => {
      const row = InvoiceRow.create('2', '50', '2022-01-15', 'Test work');
      const mbRow = row.toMoneybirdRow();

      expect(mbRow).toEqual({
        description: 'Test work',
        period: '20220115..20220115',
        price: 50,
        amount: 2
      });
    });

    it('formats period correctly', () => {
      const row = InvoiceRow.create('1', '100', '2023-12-31', 'Year end');
      const mbRow = row.toMoneybirdRow();
      expect(mbRow.period).toBe('20231231..20231231');
    });

    it('transforms realistic fixture data to Moneybird format', () => {
      const row1 = InvoiceRow.create('5', '€40.00', '2024-05-10', 'Frontend development');
      const mbRow1 = row1.toMoneybirdRow();
      expect(mbRow1).toEqual({
        description: 'Frontend development',
        period: '20240510..20240510',
        price: 40,
        amount: 5
      });

      const row2 = InvoiceRow.create('0.5', '€35.00', '13-02-2024', 'Testing forms');
      const mbRow2 = row2.toMoneybirdRow();
      expect(mbRow2).toEqual({
        description: 'Testing forms',
        period: '20240213..20240213',
        price: 35,
        amount: 0.5
      });
    });

    it('handles fractional hours and rates from real scenarios', () => {
      const row = InvoiceRow.create('0.1667', '€35,00', '2024-01-09', 'Standup meeting');
      const mbRow = row.toMoneybirdRow();
      expect(mbRow).toEqual({
        description: 'Standup meeting',
        period: '20240109..20240109',
        price: 35,
        amount: 0.1667
      });
    });
  });

  describe('realistic end-to-end scenarios', () => {
    it('creates invoice row from typical consulting work', () => {
      const row = InvoiceRow.create('4', '€30.00', '2024-08-06', 'Implementation work');
      expect(row.count).toBe(4);
      expect(row.fee).toBe(30);
      expect(row.date!.format('YYYY-MM-DD')).toBe('2024-08-06');
      expect(row.description).toBe('Implementation work');
    });

    it('creates invoice row from short meeting', () => {
      const row = InvoiceRow.create('0.25', '€42.00', '12-07-2022', 'Code review');
      expect(row.count).toBe(0.25);
      expect(row.fee).toBe(42);
      expect(row.date!.format('YYYY-MM-DD')).toBe('2022-07-12');
      expect(row.description).toBe('Code review');
    });

    it('creates invoice row with comma-formatted values', () => {
      const row = InvoiceRow.create('1,75', '€45,50', '16-07-2024', 'Bug fixing');
      expect(row.count).toBe(1.75);
      expect(row.fee).toBe(45.5);
      expect(row.date!.format('YYYY-MM-DD')).toBe('2024-07-16');
      expect(row.description).toBe('Bug fixing');
    });

    it('handles various European number formats', () => {
      const testCases = [
        { count: '2,5', fee: '€ 45.00', expectedCount: 2.5, expectedFee: 45 },
        { count: '0.125', fee: '€38,50', expectedCount: 0.125, expectedFee: 38.5 },
        { count: '1', fee: '€50', expectedCount: 1, expectedFee: 50 },
        { count: '0,33', fee: '€ 40,00', expectedCount: 0.33, expectedFee: 40 }
      ];

      testCases.forEach(({ count, fee, expectedCount, expectedFee }) => {
        const row = InvoiceRow.create(count, fee, '2024-01-15', 'Test');
        expect(row.count).toBe(expectedCount);
        expect(row.fee).toBe(expectedFee);
      });
    });
  });
});
