/**
 * Withdrawals Resource
 */

import type { APIClient } from '../lib/api.js';
import type {
  Withdrawal,
  WithdrawalCreateParams,
  WithdrawalListParams,
  PaginatedResponse,
  RequestOptions,
} from '../types/index.js';

export class Withdrawals {
  constructor(private readonly client: APIClient) {}

  /**
   * Create a new withdrawal
   *
   * @param params - Withdrawal parameters
   * @param options - Request options
   * @returns The created withdrawal
   *
   * @example
   * ```typescript
   * const withdrawal = await client.withdrawals.create({
   *   asset: 'USDT',
   *   network: 'bsc',
   *   amount: 100,
   *   address: '0x...',
   * });
   * ```
   */
  async create(params: WithdrawalCreateParams, options?: RequestOptions): Promise<Withdrawal> {
    return this.client.post<Withdrawal>('/withdrawals', params, options);
  }

  /**
   * Retrieve a withdrawal by ID
   *
   * @param id - The withdrawal ID
   * @param options - Request options
   * @returns The withdrawal
   *
   * @example
   * ```typescript
   * const withdrawal = await client.withdrawals.retrieve('wth_abc123');
   * ```
   */
  async retrieve(id: string, options?: RequestOptions): Promise<Withdrawal> {
    return this.client.get<Withdrawal>(`/withdrawals/${encodeURIComponent(id)}`, undefined, options);
  }

  /**
   * List withdrawals with optional filtering
   *
   * @param params - List parameters and filters
   * @param options - Request options
   * @returns Paginated list of withdrawals
   *
   * @example
   * ```typescript
   * const withdrawals = await client.withdrawals.list();
   *
   * // Filter by status
   * const completed = await client.withdrawals.list({
   *   status: 'completed',
   *   limit: 20,
   * });
   * ```
   */
  async list(
    params?: WithdrawalListParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<Withdrawal>> {
    return this.client.get<PaginatedResponse<Withdrawal>, WithdrawalListParams>(
      '/withdrawals',
      params,
      options
    );
  }
}
