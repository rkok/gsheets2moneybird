import fs = require('fs');
import path = require('path');
import axios from 'axios';
import { MoneybirdConfig, MoneybirdToken } from '../types/moneybird';

const TOKEN_FILE = path.resolve(__dirname, '../../config/moneybird-token.json');
const mbcfg = require('../../config/moneybird.json') as MoneybirdConfig;

async function main() {
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as MoneybirdToken;

  // Refresh access token
  const tokenRes = await axios.post('https://moneybird.com/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
    client_id: mbcfg.client_id,
    client_secret: mbcfg.client_secret
  });
  if (tokenRes.status !== 200) {
    throw new Error(`Error refreshing token: ${tokenRes.status}`);
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenRes.data, null, 2));
  const accessToken = tokenRes.data.access_token;

  // Fetch contacts
  const res = await axios.get(`https://moneybird.com/api/v2/${mbcfg.administration_id}/contacts`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status !== 200) {
    console.error(`Error fetching contacts: ${res.status} ${JSON.stringify(res.data)}`);
    process.exit(1);
  }

  console.log('ID                    Company / Name');
  console.log('--------------------  ----------------------------------------');
  for (const contact of res.data) {
    const name = contact.company_name || `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || '(no name)';
    console.log(`${contact.id.padEnd(22)}${name}`);
  }
  console.log(`\nTotal: ${res.data.length} contacts`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
