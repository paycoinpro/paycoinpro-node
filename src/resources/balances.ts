import type { APIClient } from '../lib/api.js';
import type { BalancesResponse, RequestOptions } from '../types/index.js';

export class Balances {
  constructor(private readonly client: APIClient) {}

  /**
   * Read exact available and reserved ledger balances. This is the merchant's
   * V2 ledger, not an on-chain wallet balance; never substitute one for the other.
   */
  retrieve(options?: RequestOptions): Promise<BalancesResponse> {
    return this.client.get<BalancesResponse>('/balances', undefined, options);
  }
}
