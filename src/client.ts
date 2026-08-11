import { APIClient } from './lib/api.js';
import { Assets } from './resources/assets.js';
import { Balances } from './resources/balances.js';
import { Checkouts } from './resources/checkouts.js';
import { Invoices } from './resources/invoices.js';
import { Ledger } from './resources/ledger.js';
import { WebhookEndpoints } from './resources/webhook-endpoints.js';
import { Webhooks } from './resources/webhooks.js';
import type { PayCoinProOptions } from './types/index.js';

/**
 * PayCoinPro merchant client for Payment Engine V2.
 *
 * Holds only the `ck_*` merchant key. Payouts live on PayCoinProPayouts,
 * which takes the separately scoped `pc_*` credential.
 */
export class PayCoinPro {
  readonly assets: Assets;
  readonly invoices: Invoices;
  readonly checkouts: Checkouts;
  readonly webhookEndpoints: WebhookEndpoints;
  readonly webhooks: Webhooks;
  readonly balances: Balances;
  readonly ledger: Ledger;

  constructor(options: PayCoinProOptions) {
    if (!options.apiKey) {
      throw new Error('apiKey is required (ck_test_… or ck_live_…)');
    }

    const client = new APIClient({
      credential: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
      debug: options.debug,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
    });

    this.assets = new Assets(client);
    this.invoices = new Invoices(client);
    this.checkouts = new Checkouts(client);
    this.webhookEndpoints = new WebhookEndpoints(client);
    this.webhooks = new Webhooks();
    this.balances = new Balances(client);
    this.ledger = new Ledger(client);
  }
}

export default PayCoinPro;
