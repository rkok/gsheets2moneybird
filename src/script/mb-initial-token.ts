import createMoneybirdAPI = require('../api/moneybird');
import { MoneybirdConfig } from '../types/moneybird';

const mbcfg = require('../../config/moneybird.json') as MoneybirdConfig;
const mb = createMoneybirdAPI(mbcfg);

if (process.argv.length < 3) {
  const tokenUrl = `https://moneybird.com/oauth/authorize?client_id=${mbcfg.client_id}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code`;
  console.error(`First, get an initial auth code from ${tokenUrl}`);
  console.error(`Then, use it as the argument for this script (npm run mb-initial-token <code>)`);
  process.exit(1);
}

const authCode: string = process.argv[2];

(async () => {
  const res = await mb.getAuthRequestToken(authCode);

  if (res.status === 200) {
    mb.writeTokenFile(res.data);
    console.log('Success! Token written to moneybird-token.json');
  } else {
    console.error('An error has occurred');
    console.error(res.status);
    console.error(res.data);
    process.exit(1);
  }
})();
