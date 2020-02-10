const { google } = require('googleapis');

let sheetsApi;

/**
 * @param {string} spreadsheetId
 * @param {string} range
 * @returns {Promise<Array>} rows
 */
const getSheet = (spreadsheetId, range = 'A1:M10000') => {
  return new Promise((resolve, reject) => {
    sheetsApi.spreadsheets.values.get({ spreadsheetId, range },
      (err, res) => {
        if (err) {
          return reject(new Error(`Google Docs API error: ${err}`));
        }
        resolve(res.data.values);
      });
  });
};

module.exports = (jwt) => {
  const auth = new google.auth.JWT(
    jwt.client_email,
    null,
    jwt.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  sheetsApi = google.sheets({ version: 'v4', auth });

  return { getSheet };
};
