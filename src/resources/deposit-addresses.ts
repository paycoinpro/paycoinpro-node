/**
 * Deposit Addresses Resource
 */

import type { APIClient } from '../lib/api.js';
import type {
  DepositAddress,
  DepositAddressCreateParams,
  DepositAddressListParams,
  PaginatedResponse,
  RequestOptions,
} from '../types/index.js';

export class DepositAddresses {
  constructor(private readonly client: APIClient) {}

  /**
   * Create or get a deposit address
   *
   * If an address already exists for the given asset/network combination,
   * the existing address will be returned.
   *
   * @param params - Deposit address parameters
   * @param options - Request options
   * @returns The deposit address
   *
   * @example
   * ```typescript
   * const address = await client.depositAddresses.create({
   *   asset: 'USDT',
   *   network: 'bsc',
   * });
   *
   * console.log(address.address); // '0x...'
   * ```
   */
  async create(params: DepositAddressCreateParams, options?: RequestOptions): Promise<DepositAddress> {
    return this.client.post<DepositAddress>('/deposit-addresses', params, options);
  }

  /**
   * List all deposit addresses
   *
   * @param params - List parameters and filters
   * @param options - Request options
   * @returns Paginated list of deposit addresses
   *
   * @example
   * ```typescript
   * const addresses = await client.depositAddresses.list();
   *
   * // Filter by asset
   * const usdtAddresses = await client.depositAddresses.list({
   *   asset: 'USDT',
   * });
   * ```
   */
  async list(
    params?: DepositAddressListParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<DepositAddress>> {
    return this.client.get<PaginatedResponse<DepositAddress>, DepositAddressListParams>(
      '/deposit-addresses',
      params,
      options
    );
  }
}
