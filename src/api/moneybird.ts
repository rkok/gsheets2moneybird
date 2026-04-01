import fs = require('fs');
import path = require('path');
import InvoiceRow = require('../model/InvoiceRow');
import logger = require('../util/logger');
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  MoneybirdConfig,
  MoneybirdInvoiceDetail,
  MoneybirdSalesInvoice,
  MoneybirdTaxRate,
  MoneybirdToken
} from '../types/moneybird';

const TOKEN_FILE = path.resolve(__dirname, '../../config/moneybird-token.json');
let apiBaseUrl = '/api/v2/';

const ax: AxiosInstance = axios.create({
  baseURL: 'https://moneybird.com',
  validateStatus: status => status >= 200 && status < 500
});

const getAuthRequestToken = (authCode: string, cfg: MoneybirdConfig): Promise<AxiosResponse<MoneybirdToken>> => {
  return ax.post<MoneybirdToken>('/oauth/token', {
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    grant_type: 'authorization_code',
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    code: authCode
  });
};

const refreshAccessToken = async (refreshToken: string, cfg: MoneybirdConfig): Promise<string> => {
  logger.debug('Refreshing Moneybird access token');
  const res = await ax.post<MoneybirdToken>('/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.client_id,
    client_secret: cfg.client_secret
  });
  if (res.status !== 200) {
    throw new Error(`Error refreshing access token: ${res.status} ${JSON.stringify(res.data)}`);
  }
  writeTokenFile(res.data);
  logger.debug('Successfully refreshed access token');
  return res.data.access_token;
};

const writeTokenFile = (token: MoneybirdToken): void => {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
};

const getAllSalesInvoices = async (): Promise<MoneybirdSalesInvoice[]> => {
  logger.debug('Fetching all sales invoices from Moneybird');
  const res = await ax.get<MoneybirdSalesInvoice[]>(`${apiBaseUrl}/sales_invoices`);
  logger.debug(`Retrieved ${res.data.length} sales invoices`);
  return res.data;
};

const getZeroVatRateId = async (): Promise<string | false> => {
  logger.debug('Fetching tax rates from Moneybird');
  const res = await ax.get<MoneybirdTaxRate[]>(`${apiBaseUrl}/tax_rates`);
  if (res.status !== 200) {
    throw new Error(`Unable to get Moneybird tax rates; ${res.status} ${JSON.stringify(res.data)}`);
  }
  const rate = res.data.find((rate: MoneybirdTaxRate) => parseFloat(rate.percentage) === 0);
  logger.debug(rate ? `Found 0% VAT rate with ID: ${rate.id}` : '0% VAT rate not found');
  return rate ? rate.id : false;
};

/**
 * @param rows
 * @param includeVat
 * @param cfg
 * @returns invoiceId
 */
const createSalesInvoice = async (rows: InvoiceRow[], includeVat: boolean = true, contactId: string): Promise<string> => {
  logger.debug(`Creating sales invoice for contact ${contactId} with ${rows.length} rows`);
  let mbRows: MoneybirdInvoiceDetail[] = rows.map(row => row.toMoneybirdRow());

  if (includeVat === false) {
    logger.debug('VAT excluded - fetching 0% VAT rate');
    const rateId = await getZeroVatRateId();
    if (!rateId) {
      throw new Error('VAT to be excluded, but 0%-VAT rate ID could not be determined');
    }
    mbRows.forEach(row => {
      row.tax_rate_id = rateId;
    });
  }

  // Auto-set reference to "Mon YYYY" if all rows are from the same month
  let reference: string | undefined;
  if (rows.length > 0) {
    const firstDate = rows[0].date;
    const allSameMonth = rows.every(row =>
      row.date.year() === firstDate.year() && row.date.month() === firstDate.month()
    );
    if (allSameMonth) {
      reference = firstDate.locale('en').format('MMM YYYY');
      logger.debug(`Auto-generated invoice reference: ${reference}`);
    }
  }

  logger.debug('Posting sales invoice to Moneybird API');
  const res = await ax.post<MoneybirdSalesInvoice>(`${apiBaseUrl}/sales_invoices`, {
    sales_invoice: {
      contact_id: contactId,
      ...(reference && { reference }),
      details_attributes: mbRows
    }
  });
  if (res.status !== 201) {
    throw new Error(`Error creating sales invoice: ${res.status} ${JSON.stringify(res.data)}`);
  }
  logger.debug(`Successfully created sales invoice with ID: ${res.data.id}`);
  return res.data.id;
};

function createMoneybirdAPI(mbcfg: MoneybirdConfig) {
  apiBaseUrl += mbcfg.administration_id;
  logger.debug(`Moneybird API base URL: https://moneybird.com${apiBaseUrl}`);

  return {
    init: async (): Promise<void> => {
      logger.debug('Initializing Moneybird API');
      if (fs.existsSync(TOKEN_FILE)) {
        const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as MoneybirdToken;
        const accessToken = await refreshAccessToken(tokenData.refresh_token, mbcfg);
        ax.interceptors.request.use(config => {
          config.headers.authorization = `Bearer ${accessToken}`;
          return config;
        });
        logger.debug('Moneybird API initialized successfully');
      }
    },
    getAuthRequestToken: (authCode: string) => getAuthRequestToken(authCode, mbcfg),
    writeTokenFile,
    getAllSalesInvoices,
    createSalesInvoice: (rows: InvoiceRow[], includeVat: boolean, contactId: string) => createSalesInvoice(rows, includeVat, contactId),
    /**
     * @param id
     * @returns
     */
    getSalesInvoicePdf: async (id: string) => {
      logger.debug(`Downloading PDF for sales invoice: ${id}`);
      const res = await ax.get(`${apiBaseUrl}/sales_invoices/${id}/download_pdf`, { responseType: 'stream' });
      if (res.status !== 200) {
        throw new Error(`Error downloading sales invoice: ${res.status} ${JSON.stringify(res.data)}`);
      }
      logger.debug(`Successfully retrieved PDF stream for invoice: ${id}`);
      return res.data;
    }
  };
}

export = createMoneybirdAPI;
