import { google, sheets_v4 } from 'googleapis';

interface JWTCredentials {
  client_email: string;
  private_key: string;
}

interface GSheetsAPI {
  getSheet: (spreadsheetId: string, range?: string) => Promise<string[][]>;
}

let sheetsApi: sheets_v4.Sheets;

/**
 * @param spreadsheetId
 * @param range
 * @returns rows
 */
const getSheet = (spreadsheetId: string, range: string = 'A1:M10000'): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    sheetsApi.spreadsheets.values.get({ spreadsheetId, range },
      (err, res) => {
        if (err) {
          return reject(new Error(`Google Docs API error: ${err}`));
        }
        resolve((res?.data.values || []) as string[][]);
      });
  });
};

function createGSheetsAPI(jwt: JWTCredentials): GSheetsAPI {
  const auth = new google.auth.JWT(
    jwt.client_email,
    undefined,
    jwt.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  sheetsApi = google.sheets({ version: 'v4', auth });

  return { getSheet };
}

export = createGSheetsAPI;
