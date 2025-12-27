/**
 * PayCoinPro Client
 */

import type { PayCoinProOptions } from './types/index.js';
import { APIClient } from './lib/api.js';
import { Invoices } from './resources/invoices.js';
import { DepositAddresses } from './resources/deposit-addresses.js';
import { Deposits } from './resources/deposits.js';
import { Assets } from './resources/assets.js';
import { Webhooks } from './resources/webhooks.js';

/**
 * PayCoinPro SDK Client
 */
export class PayCoinPro {
  readonly invoices: Invoices;
  readonly depositAddresses: DepositAddresses;
  readonly deposits: Deposits;
  readonly assets: Assets;
  readonly webhooks: Webhooks;

  constructor(options: PayCoinProOptions) {
    const client = new APIClient(options);
    this.invoices = new Invoices(client);
    this.depositAddresses = new DepositAddresses(client);
    this.deposits = new Deposits(client);
    this.assets = new Assets(client);
    this.webhooks = new Webhooks();
  }
}

export default PayCoinPro;
