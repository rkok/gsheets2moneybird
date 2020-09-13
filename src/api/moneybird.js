const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TOKEN_FILE = path.resolve(__dirname, '../../config/moneybird-token.json');
let apiBaseUrl = '/api/v2/';

const ax = axios.create({
  baseURL: 'https://moneybird.com',
  validateStatus: status => status >= 200 && status < 500
});

const getAuthRequestToken = (authCode, cfg) => {
  return ax.post('/oauth/token', {
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    grant_type: 'authorization_code',
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    code: authCode
  });
};

const refreshAccessToken = async (refreshToken, cfg) => {
  const res = await ax.post('/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.client_id,
    client_secret: cfg.client_secret
  });
  if (res.status !== 200) {
    throw new Error(`Error refreshing access token: ${res.status} ${JSON.stringify(res.data)}`);
  }
  writeTokenFile(res.data);
  return res.data.access_token;
};

const writeTokenFile = (token) => {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
};

const getAllSalesInvoices = async () => {
  const res = await ax.get(`${apiBaseUrl}/sales_invoices`);
  return res.data;
};

const getZeroVatRateId = async () => {
  const res = await ax.get(`${apiBaseUrl}/tax_rates`);
  if (res.status !== 200) {
    throw new Error(`Unable to get Moneybird tax rates; ${res.status} ${JSON.stringify(res.data)}`);
  }
  const rate = res.data.find(rate => parseFloat(rate.percentage) === 0);
  return rate ? rate.id : false;
};

/**
 * @param {InvoiceRow[]} rows
 * @param {boolean} includeVat
 * @param {object} cfg
 * @returns {Promise<string>} invoiceId
 */
const createSalesInvoice = async (rows, includeVat = true, cfg) => {
  let mbRows = rows.map(row => row.toMoneybirdRow());

  if (includeVat === false) {
    const rateId = await getZeroVatRateId();
    if (!rateId) {
      throw new Error('VAT to be excluded, but 0%-VAT rate ID could not be determined');
    }
    mbRows.forEach(row => {
      row.tax_rate_id = rateId;
    });
  }

  const res = await ax.post(`${apiBaseUrl}/sales_invoices`, {
    sales_invoice: {
      contact_id: cfg.dummy_contact_id,
      details_attributes: mbRows
    }
  });
  if (res.status !== 201) {
    throw new Error(`Error creating sales invoice: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.id;
};

module.exports = (mbcfg) => {
  apiBaseUrl += mbcfg.administration_id;

  return {
    init: async () => {
      if (fs.existsSync(TOKEN_FILE)) {
        const accessToken = await refreshAccessToken(require(TOKEN_FILE).refresh_token, mbcfg);
        ax.interceptors.request.use(config => {
          config.headers.authorization = `Bearer ${accessToken}`;
          return config;
        });
      }
    },
    getAuthRequestToken: authCode => getAuthRequestToken(authCode, mbcfg),
    writeTokenFile,
    getAllSalesInvoices,
    createSalesInvoice: (rows, includeVat) => createSalesInvoice(rows, includeVat, mbcfg),
    /**
     * @param id
     * @returns {Promise<IncomingMessage>}
     */
    getSalesInvoicePdf: async id => {
      const res = await ax.get(`${apiBaseUrl}/sales_invoices/${id}/download_pdf`, { responseType: 'stream' });
      if (res.status !== 200) {
        throw new Error(`Error downloading sales invoice: ${res.status} ${JSON.stringify(res.data)}`);
      }
      return res.data;
    }
  };
};
