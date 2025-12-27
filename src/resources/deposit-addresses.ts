import type { APIClient } from '../lib/api.js';
import type {
  DepositAddressCreated,
  CreateDepositAddressRequest,
  DepositAddressListResponse,
  paths,
} from '../types/index.js';

type DepositAddressListParams = paths['/api/v1/deposit-addresses']['get']['parameters']['query'];

export class DepositAddresses {
  constructor(private readonly client: APIClient) {}

  async create(params: CreateDepositAddressRequest): Promise<DepositAddressCreated> {
    return this.client.post<DepositAddressCreated>('/deposit-addresses', params);
  }

  async list(params?: DepositAddressListParams): Promise<DepositAddressListResponse> {
    return this.client.get<DepositAddressListResponse>(
      '/deposit-addresses',
      params as Record<string, unknown>
    );
  }
}
