/**
 * Poor man's csv parser
 * @param csv CSV file contents
 * @returns Parsed CSV rows
 */
function parseCsv(csv: string): string[][] {
  const lines = csv.split('\n');
  const rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().length) continue;
    rows.push(lines[i].split(';'));
  }

  return rows;
}

export = parseCsv;
