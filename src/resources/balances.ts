/**
 * Balances Resource
 */

import type { APIClient } from '../lib/api.js';
import type {
  Balance,
  BalanceListParams,
  RequestOptions,
} from '../types/index.js';

export class Balances {
  constructor(private readonly client: APIClient) {}

  /**
   * Get merchant balances
   *
   * @param params - Optional parameters to filter balances
   * @param options - Request options
   * @returns List of balances for each asset
   *
   * @example
   * ```typescript
   * const balances = await client.balances.list();
   *
   * for (const balance of balances) {
   *   console.log(`${balance.asset}: ${balance.available} available`);
   * }
   * ```
   */
  async list(params?: BalanceListParams, options?: RequestOptions): Promise<Balance[]> {
    return this.client.get<Balance[], BalanceListParams>('/balances', params, options);
  }

  /**
   * Get balance for a specific asset
   *
   * @param asset - The asset to get balance for (e.g., 'USDT', 'BTC')
   * @param options - Request options
   * @returns The balance for the specified asset
   *
   * @example
   * ```typescript
   * const usdtBalance = await client.balances.retrieve('USDT');
   * console.log(`Available: ${usdtBalance.available}`);
   * ```
   */
  async retrieve(asset: string, options?: RequestOptions): Promise<Balance> {
    return this.client.get<Balance>(`/balances/${encodeURIComponent(asset)}`, undefined, options);
  }
}
