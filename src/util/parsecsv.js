/**
 * Poor man's csv parser
 * @param {string} csv CSV file contents
 */
module.exports = (csv) => {
  const lines = csv.split('\n');
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().length) continue;
    rows.push(lines[i].split(';'));
  }

  return rows;
};
