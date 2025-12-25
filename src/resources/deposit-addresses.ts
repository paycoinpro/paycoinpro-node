import type { APIClient } from '../lib/api.js';
import type { DepositAddress, DepositAddressCreateParams, DepositAddressListParams, PaginatedResponse } from '../types/index.js';

export class DepositAddresses {
  constructor(private readonly client: APIClient) {}

  async create(params: DepositAddressCreateParams): Promise<DepositAddress> {
    return this.client.post<DepositAddress>('/deposit-addresses', params);
  }

  async list(params?: DepositAddressListParams): Promise<PaginatedResponse<DepositAddress>> {
    return this.client.get<PaginatedResponse<DepositAddress>, DepositAddressListParams>('/deposit-addresses', params);
  }
}
