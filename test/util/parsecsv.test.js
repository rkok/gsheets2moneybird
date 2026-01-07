const parsecsv = require('../../src/util/parsecsv');

describe('parsecsv', () => {
  it('parses semicolon-delimited CSV', () => {
    const csv = 'a;b;c\n1;2;3';
    const result = parsecsv(csv);
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('skips empty lines', () => {
    const csv = 'a;b\n\nc;d';
    const result = parsecsv(csv);
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('handles single row', () => {
    const csv = 'a;b;c';
    const result = parsecsv(csv);
    expect(result).toEqual([['a', 'b', 'c']]);
  });

  it('handles empty string', () => {
    const csv = '';
    const result = parsecsv(csv);
    expect(result).toEqual([]);
  });

  it('handles whitespace-only lines', () => {
    const csv = 'a;b\n   \nc;d';
    const result = parsecsv(csv);
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('parses realistic invoice data with headers', () => {
    const csv = 'Datum;Uren;Omschrijving;Uurtarief;Factuurnr.\n2024-05-10;5;Frontend development;€40.00;2024-0019\n2024-01-31;0.5;Testing forms;€35.00;2024-0004';
    const result = parsecsv(csv);
    expect(result).toEqual([
      ['Datum', 'Uren', 'Omschrijving', 'Uurtarief', 'Factuurnr.'],
      ['2024-05-10', '5', 'Frontend development', '€40.00', '2024-0019'],
      ['2024-01-31', '0.5', 'Testing forms', '€35.00', '2024-0004']
    ]);
  });

  it('parses data with varying column counts', () => {
    const csv = 'Datum;Uren;Klant;Omschrijving;Bedrag;Factuurnr.\n13-02-2024;1;€45.00;ClientA;Analysis;€45.00;2024-0007';
    const result = parsecsv(csv);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(6);
    expect(result[1].length).toBe(7);
  });

  it('handles empty fields in CSV', () => {
    const csv = 'Datum;Uren;Omschrijving;Uurtarief;Factuurnr.\n2024-08-06;4;Implementation;;2024-0030\n2024-08-09;1;Testing;€30.00;';
    const result = parsecsv(csv);
    expect(result).toEqual([
      ['Datum', 'Uren', 'Omschrijving', 'Uurtarief', 'Factuurnr.'],
      ['2024-08-06', '4', 'Implementation', '', '2024-0030'],
      ['2024-08-09', '1', 'Testing', '€30.00', '']
    ]);
  });

  it('parses multi-line realistic dataset', () => {
    const csv = 'Datum;Uren;Omschrijving;Factuurnr.\n12-07-2022;0.5;Code review;2022-0042\n04-07-2022;1.25;Kick-off meeting;2022-0042\n\n15-08-2022;0.75;Documentation;2022-0043';
    const result = parsecsv(csv);
    expect(result).toEqual([
      ['Datum', 'Uren', 'Omschrijving', 'Factuurnr.'],
      ['12-07-2022', '0.5', 'Code review', '2022-0042'],
      ['04-07-2022', '1.25', 'Kick-off meeting', '2022-0042'],
      ['15-08-2022', '0.75', 'Documentation', '2022-0043']
    ]);
  });

  it('handles special characters in descriptions', () => {
    const csv = 'Datum;Uren;Omschrijving\n2024-01-15;2;Fix client/server issue\n2024-01-16;1.5;Update & test';
    const result = parsecsv(csv);
    expect(result).toEqual([
      ['Datum', 'Uren', 'Omschrijving'],
      ['2024-01-15', '2', 'Fix client/server issue'],
      ['2024-01-16', '1.5', 'Update & test']
    ]);
  });
});
