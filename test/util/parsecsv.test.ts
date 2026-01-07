import parseCsv = require('../../src/util/parsecsv');

describe('parsecsv', () => {
  it('parses semicolon-delimited CSV', () => {
    const csv = 'a;b;c\n1;2;3';
    const result = parseCsv(csv);
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('skips empty lines', () => {
    const csv = 'a;b\n\n1;2\n\n';
    const result = parseCsv(csv);
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles single row', () => {
    const csv = 'only;one;row';
    const result = parseCsv(csv);
    expect(result).toEqual([['only', 'one', 'row']]);
  });

  it('handles empty string', () => {
    const csv = '';
    const result = parseCsv(csv);
    expect(result).toEqual([]);
  });

  it('handles whitespace-only lines', () => {
    const csv = 'a;b\n   \n1;2';
    const result = parseCsv(csv);
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('parses realistic invoice data with headers', () => {
    const csv = 'Date;Hours;Description\n2024-01-15;4;Development work\n2024-01-16;2.5;Bug fixes';
    const result = parseCsv(csv);
    expect(result).toEqual([
      ['Date', 'Hours', 'Description'],
      ['2024-01-15', '4', 'Development work'],
      ['2024-01-16', '2.5', 'Bug fixes']
    ]);
  });

  it('parses data with varying column counts', () => {
    const csv = 'a;b;c\n1;2\nx;y;z;extra';
    const result = parseCsv(csv);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2'],
      ['x', 'y', 'z', 'extra']
    ]);
  });

  it('handles empty fields in CSV', () => {
    const csv = 'a;;c\n;2;';
    const result = parseCsv(csv);
    expect(result).toEqual([
      ['a', '', 'c'],
      ['', '2', '']
    ]);
  });

  it('parses multi-line realistic dataset', () => {
    const csv = [
      'Date;Hours;Description;Rate',
      '2024-01-10;8;Full day development;€50',
      '2024-01-11;4;Morning meeting;€50',
      '2024-01-12;2.5;Code review;€50'
    ].join('\n');
    const result = parseCsv(csv);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(['Date', 'Hours', 'Description', 'Rate']);
    expect(result[3]).toEqual(['2024-01-12', '2.5', 'Code review', '€50']);
  });

  it('handles special characters in descriptions', () => {
    const csv = 'Date;Description\n2024-01-15;Meeting @ 10:00 (remote)\n2024-01-16;Fix bug #123 & deploy';
    const result = parseCsv(csv);
    expect(result).toEqual([
      ['Date', 'Description'],
      ['2024-01-15', 'Meeting @ 10:00 (remote)'],
      ['2024-01-16', 'Fix bug #123 & deploy']
    ]);
  });
});
