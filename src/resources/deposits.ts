/**
 * Deposits Resource
 */

import type { APIClient } from '../lib/api.js';
import type {
  Deposit,
  DepositListParams,
  PaginatedResponse,
  RequestOptions,
} from '../types/index.js';

export class Deposits {
  constructor(private readonly client: APIClient) {}

  /**
   * List deposits with optional filtering
   *
   * @param params - List parameters and filters
   * @param options - Request options
   * @returns Paginated list of deposits
   *
   * @example
   * ```typescript
   * const deposits = await client.deposits.list();
   *
   * // Filter by asset and status
   * const confirmedUSDT = await client.deposits.list({
   *   asset: 'USDT',
   *   status: 'confirmed',
   *   limit: 50,
   * });
   * ```
   */
  async list(
    params?: DepositListParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<Deposit>> {
    return this.client.get<PaginatedResponse<Deposit>, DepositListParams>(
      '/deposits',
      params,
      options
    );
  }

  /**
   * Retrieve a deposit by ID
   *
   * @param id - The deposit ID
   * @param options - Request options
   * @returns The deposit
   *
   * @example
   * ```typescript
   * const deposit = await client.deposits.retrieve('dep_abc123');
   * ```
   */
  async retrieve(id: string, options?: RequestOptions): Promise<Deposit> {
    return this.client.get<Deposit>(`/deposits/${encodeURIComponent(id)}`, undefined, options);
  }
}
