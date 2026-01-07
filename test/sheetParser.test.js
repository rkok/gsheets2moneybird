// Mock config before importing sheetParser
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

const { parseInvoiceRows } = require('../src/sheetParser');

describe('sheetParser', () => {
  const makeRows = (dataRows) => {
    const header = ['Date', 'Customer', 'Hours', 'Rate', 'Description', 'Invoice no.'];
    return [header, ...dataRows];
  };

  describe('error handling', () => {
    it('throws on empty rows', () => {
      expect(() => parseInvoiceRows([], {})).toThrow('No rows in the given sheet');
    });

    it('throws on missing required columns', () => {
      const rows = [['WrongCol1', 'WrongCol2']];
      expect(() => parseInvoiceRows(rows, {})).toThrow('Not all necessary columns are included');
    });
  });

  describe('row filtering', () => {
    it('filters out header row', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '2', '50', 'Work done', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(1);
    });

    it('filters out rows without count', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '', '50', 'No hours', ''],
        ['2022-01-02', 'Acme', '2', '50', 'Has hours', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(1);
      expect(result[0].description).toBe('Acme: Has hours');
    });

    it('filters out already-invoiced rows when no dateRange', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '2', '50', 'Invoiced', 'INV-001'],
        ['2022-01-02', 'Acme', '3', '50', 'Not invoiced', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(1);
      expect(result[0].description).toBe('Acme: Not invoiced');
    });

    it('keeps invoiced rows when dateRange is provided', () => {
      const rows = makeRows([
        ['2022-01-15', 'Acme', '2', '50', 'Invoiced', 'INV-001']
      ]);
      const result = parseInvoiceRows(rows, {
        dateRange: [new Date('2022-01-01'), new Date('2022-01-31')]
      });
      expect(result.length).toBe(1);
    });

    it('filters by date range', () => {
      const rows = makeRows([
        ['2022-01-15', 'Acme', '2', '50', 'In range', ''],
        ['2022-02-15', 'Acme', '3', '50', 'Out of range', '']
      ]);
      const result = parseInvoiceRows(rows, {
        dateRange: [new Date('2022-01-01'), new Date('2022-01-31')]
      });
      expect(result.length).toBe(1);
      expect(result[0].description).toBe('Acme: In range');
    });

    it('skips rows with missing date when using dateRange', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const rows = makeRows([
        ['', 'Acme', '2', '50', 'No date', ''],
        ['2022-01-15', 'Acme', '3', '50', 'Has date', '']
      ]);
      const result = parseInvoiceRows(rows, {
        dateRange: [new Date('2022-01-01'), new Date('2022-01-31')]
      });
      expect(result.length).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('Skipping row due to missing date');
      consoleSpy.mockRestore();
    });
  });

  describe('fee handling', () => {
    it('uses row fee when provided', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '2', '75', 'With fee', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].fee).toBe(75);
    });

    it('uses default fee as fallback', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '2', '', 'No fee', '']
      ]);
      const result = parseInvoiceRows(rows, { defaultFee: 100 });
      expect(result[0].fee).toBe(100);
    });

    it('parses fee with € and comma', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme', '2', '€45,50', 'Euro fee', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].fee).toBe(45.5);
    });
  });

  describe('description handling', () => {
    it('prepends client to description', () => {
      const rows = makeRows([
        ['2022-01-01', 'Acme Corp', '2', '50', 'Development work', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].description).toBe('Acme Corp: Development work');
    });

    it('handles description without client', () => {
      const rows = makeRows([
        ['2022-01-01', '', '2', '50', 'Solo work', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].description).toBe('Solo work');
    });

    it('handles realistic client descriptions', () => {
      const rows = makeRows([
        ['2024-05-10', 'TechCorp', '5', '€40.00', 'Frontend development', ''],
        ['2024-01-31', 'DataSys', '0.5', '€35.00', 'Testing forms', ''],
        ['2023-10-10', 'CloudNet', '0.8', '€45.00', 'Refinement call', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(3);
      expect(result[0].description).toBe('TechCorp: Frontend development');
      expect(result[1].description).toBe('DataSys: Testing forms');
      expect(result[2].description).toBe('CloudNet: Refinement call');
    });
  });

  describe('date parsing in rows', () => {
    it('parses YYYY-MM-DD format', () => {
      const rows = makeRows([
        ['2022-06-15', 'Acme', '2', '50', 'Work', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].date.format('YYYY-MM-DD')).toBe('2022-06-15');
    });

    it('parses DD-MM-YYYY format', () => {
      const rows = makeRows([
        ['15-06-2022', 'Acme', '2', '50', 'Work', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result[0].date.format('YYYY-MM-DD')).toBe('2022-06-15');
    });

    it('parses mixed date formats from realistic data', () => {
      const rows = makeRows([
        ['2024-08-06', 'ClientA', '4', '€30.00', 'Implementation work', ''],
        ['13-02-2024', 'ClientB', '1', '€45.00', 'Analysis', ''],
        ['2022-07-12', 'ClientC', '0.5', '€40.00', 'Standup meeting', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(3);
      expect(result[0].date.format('YYYY-MM-DD')).toBe('2024-08-06');
      expect(result[1].date.format('YYYY-MM-DD')).toBe('2024-02-13');
      expect(result[2].date.format('YYYY-MM-DD')).toBe('2022-07-12');
    });
  });

  describe('realistic multi-row scenarios', () => {
    it('processes multiple rows with varying hours and rates', () => {
      const rows = makeRows([
        ['2024-05-10', 'TechCorp', '5', '', 'Frontend development', ''],
        ['2024-01-31', 'TechCorp', '0.5', '', 'Testing forms', ''],
        ['2023-10-10', 'TechCorp', '0.8', '', 'Refinement call', ''],
        ['2024-01-30', 'TechCorp', '2.5', '', 'Add input fields', '']
      ]);
      const result = parseInvoiceRows(rows, { defaultFee: 40 });
      expect(result.length).toBe(4);
      expect(result[0].count).toBe(5);
      expect(result[1].count).toBe(0.5);
      expect(result[2].count).toBe(0.8);
      expect(result[3].count).toBe(2.5);
      expect(result.every(r => r.fee === 40)).toBe(true);
    });

    it('handles fractional hours like 0.1667 and 0.083', () => {
      const rows = makeRows([
        ['2024-01-09', 'DevTeam', '0.1667', '€35.00', 'Standup', ''],
        ['2024-02-29', 'DevTeam', '0.083', '€35.00', 'Quick sync', ''],
        ['2024-01-23', 'DevTeam', '0.665', '€35.00', 'Planning meeting', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(3);
      expect(result[0].count).toBe(0.1667);
      expect(result[1].count).toBe(0.083);
      expect(result[2].count).toBe(0.665);
    });

    it('processes invoiced rows with invoice numbers', () => {
      const rows = makeRows([
        ['2024-08-06', 'ClientX', '4', '€30.00', 'Implementation', '2024-0030'],
        ['2024-08-09', 'ClientX', '1', '€30.00', 'Testing', '2024-0030'],
        ['2024-09-03', 'ClientX', '0.16', '€30.00', 'Minor update', '2024-0041']
      ]);
      const result = parseInvoiceRows(rows, {
        dateRange: [new Date('2024-08-01'), new Date('2024-09-30')]
      });
      expect(result.length).toBe(3);
      expect(result[0].description).toBe('ClientX: Implementation');
      expect(result[1].description).toBe('ClientX: Testing');
      expect(result[2].description).toBe('ClientX: Minor update');
    });

    it('handles rows with different rate formats', () => {
      const rows = makeRows([
        ['12-07-2022', 'ProjectA', '0.5', '', 'Code review', ''],
        ['04-07-2022', 'ProjectA', '1.25', '', 'Kick-off meeting', ''],
        ['15-08-2022', 'ProjectA', '0.75', '', 'Documentation', '']
      ]);
      const result = parseInvoiceRows(rows, { defaultFee: 38 });
      expect(result.length).toBe(3);
      expect(result[0].fee).toBe(38);
      expect(result[1].fee).toBe(38);
      expect(result[2].fee).toBe(38);
    });

    it('filters and processes complex real-world dataset', () => {
      const rows = makeRows([
        ['2024-10-02', 'ProjectB', '0.25', '', 'Standup', '2024-0043'],
        ['2024-10-29', 'ProjectB', '1', '', 'Coaching session', ''],
        ['2024-10-29', 'ProjectB', '0.25', '', 'Testing and bugfix', ''],
        ['2024-10-28', 'ProjectB', '', '', 'No hours logged', ''],
        ['2024-10-11', 'ProjectB', '0.66', '', 'Ticket refinement', '']
      ]);
      const result = parseInvoiceRows(rows, { defaultFee: 42 });
      // Should filter out row with no hours and already-invoiced row
      expect(result.length).toBe(3);
      expect(result[0].description).toBe('ProjectB: Coaching session');
      expect(result[1].description).toBe('ProjectB: Testing and bugfix');
      expect(result[2].description).toBe('ProjectB: Ticket refinement');
    });

    it('handles various European currency formats', () => {
      const rows = makeRows([
        ['2024-08-06', 'ClientY', '4', '€30.00', 'Work A', ''],
        ['2024-08-09', 'ClientY', '1', '€ 45.00', 'Work B', ''],
        ['2024-09-03', 'ClientY', '0.5', '€50,00', 'Work C', '']
      ]);
      const result = parseInvoiceRows(rows, {});
      expect(result.length).toBe(3);
      expect(result[0].fee).toBe(30);
      expect(result[1].fee).toBe(45);
      expect(result[2].fee).toBe(50);
    });
  });
});
