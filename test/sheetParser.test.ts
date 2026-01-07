import { parseInvoiceRows } from '../src/sheetParser';

// Mock the config module
jest.mock('config', () => ({
  columnNames: {
    date: 'Date',
    numberOfHours: 'Hours',
    description: 'Description',
    invoiceNumber: 'Invoice no.',
    hourlyRate: 'Rate',
    customer: 'Customer'
  }
}));

describe('sheetParser', () => {
  describe('error handling', () => {
    it('throws on empty rows', () => {
      expect(() => parseInvoiceRows([], {})).toThrow('No rows in the given sheet');
    });

    it('throws on missing required columns', () => {
      const rows = [['Wrong', 'Columns']];
      expect(() => parseInvoiceRows(rows, {})).toThrow('Not all necessary columns are included');
    });
  });

  describe('row filtering', () => {
    it('filters out header row', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'Work', '', '€50']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(1);
    });

    it('filters out rows without count', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work', ''],
        ['2024-01-16', '', 'Empty hours', ''],
        ['2024-01-17', '2', 'More work', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(2);
    });

    it('filters out already-invoiced rows when no dateRange', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work', ''],
        ['2024-01-16', '3', 'Already invoiced', 'INV-123'],
        ['2024-01-17', '2', 'More work', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Work');
      expect(result[1].description).toBe('More work');
    });

    it('keeps invoiced rows when dateRange is provided', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work', 'INV-123']
      ];
      const dateRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-02-01')];
      const result = parseInvoiceRows(rows, { defaultFee: 50, dateRange });
      expect(result).toHaveLength(1);
    });

    it('filters by date range', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'In range', ''],
        ['2024-02-15', '3', 'Out of range', ''],
        ['2024-01-20', '2', 'Also in range', '']
      ];
      const dateRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-02-01')];
      const result = parseInvoiceRows(rows, { defaultFee: 50, dateRange });
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('In range');
      expect(result[1].description).toBe('Also in range');
    });

    it('skips rows with missing date when using dateRange', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Has date', ''],
        ['', '3', 'Missing date', '']
      ];
      const dateRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-02-01')];
      const result = parseInvoiceRows(rows, { defaultFee: 50, dateRange });

      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Skipping row due to missing date');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('fee handling', () => {
    it('uses row fee when provided', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'Work', '', '€60']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].fee).toBe(60);
    });

    it('uses default fee as fallback', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'Work', '', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].fee).toBe(50);
    });

    it('parses fee with € and comma', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'Work', '', '€45,50']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].fee).toBe(45.5);
    });
  });

  describe('description handling', () => {
    it('prepends client to description', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Customer'],
        ['2024-01-15', '4', 'Work done', '', 'ClientA']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].description).toBe('ClientA: Work done');
    });

    it('handles description without client', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work done', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].description).toBe('Work done');
    });

    it('handles realistic client descriptions', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Customer'],
        ['2024-01-15', '4', 'Frontend development', '', 'Acme Corp'],
        ['2024-01-16', '2', 'Bug fixing', '', 'TechStart Inc']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].description).toBe('Acme Corp: Frontend development');
      expect(result[1].description).toBe('TechStart Inc: Bug fixing');
    });
  });

  describe('date parsing in rows', () => {
    it('parses YYYY-MM-DD format', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].date!.format('YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('parses DD-MM-YYYY format', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['15-01-2024', '4', 'Work', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].date!.format('YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('parses mixed date formats from realistic data', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.'],
        ['2024-01-15', '4', 'Work A', ''],
        ['16-01-2024', '3', 'Work B', '']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].date!.format('YYYY-MM-DD')).toBe('2024-01-15');
      expect(result[1].date!.format('YYYY-MM-DD')).toBe('2024-01-16');
    });
  });

  describe('realistic multi-row scenarios', () => {
    it('processes multiple rows with varying hours and rates', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '8', 'Full day', '', '€50'],
        ['2024-01-16', '4', 'Half day', '', '€55'],
        ['2024-01-17', '2', 'Meeting', '', '€50']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(3);
      expect(result[0].count).toBe(8);
      expect(result[1].count).toBe(4);
      expect(result[1].fee).toBe(55);
    });

    it('handles fractional hours like 0.1667 and 0.083', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '0.1667', 'Quick meeting', '', '€50'],
        ['2024-01-16', '0.083', 'Brief call', '', '€50']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].count).toBeCloseTo(0.1667, 4);
      expect(result[1].count).toBeCloseTo(0.083, 3);
    });

    it('processes invoiced rows with invoice numbers', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '8', 'Full day', 'INV-001', '€50'],
        ['2024-01-16', '4', 'Not invoiced', '', '€50']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Not invoiced');
    });

    it('handles rows with different rate formats', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'With space', '', '€ 50,00'],
        ['2024-01-16', '3', 'No space', '', '€45.50'],
        ['2024-01-17', '2', 'Just number', '', '60']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].fee).toBe(50);
      expect(result[1].fee).toBe(45.5);
      expect(result[2].fee).toBe(60);
    });

    it('filters and processes complex real-world dataset', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate', 'Customer'],
        ['2024-01-15', '8', 'Development', '', '€50', 'ClientA'],
        ['2024-01-16', '', 'No hours', '', '€50', 'ClientA'],
        ['2024-01-17', '4', 'Already billed', 'INV-001', '€50', 'ClientA'],
        ['2024-01-18', '2,5', 'Meeting', '', '€45,50', 'ClientB']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('ClientA: Development');
      expect(result[1].description).toBe('ClientB: Meeting');
      expect(result[1].count).toBe(2.5);
      expect(result[1].fee).toBe(45.5);
    });

    it('handles various European currency formats', () => {
      const rows = [
        ['Date', 'Hours', 'Description', 'Invoice no.', 'Rate'],
        ['2024-01-15', '4', 'Test1', '', '€ 50,00'],
        ['2024-01-16', '3', 'Test2', '', '€45.50'],
        ['2024-01-17', '2', 'Test3', '', '60']
      ];
      const result = parseInvoiceRows(rows, { defaultFee: 50 });
      expect(result[0].fee).toBe(50);
      expect(result[1].fee).toBe(45.5);
      expect(result[2].fee).toBe(60);
    });
  });
});
