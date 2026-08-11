import { APIClient } from './lib/api.js';
import { Payouts } from './resources/payouts.js';
import type { PayoutClientOptions } from './types/index.js';

/**
 * Payout client.
 *
 * Deliberately separate from PayCoinPro. It holds only the `pc_*` payout
 * credential, so an application that never pays out never constructs an object
 * carrying it, and the credential cannot reach an ordinary invoice request path
 * or a log line written for one.
 */
export class PayCoinProPayouts {
  readonly payouts: Payouts;

  constructor(options: PayoutClientOptions) {
    if (!options.credential) {
      throw new Error('A pc_* payout credential is required');
    }

    const client = new APIClient({
      credential: options.credential,
      baseURL: options.baseURL,
      timeout: options.timeout,
      debug: options.debug,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
    });

    this.payouts = new Payouts(client);
  }
}
