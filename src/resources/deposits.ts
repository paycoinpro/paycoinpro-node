import type { APIClient } from '../lib/api.js';
import type { DepositListResponse, paths } from '../types/index.js';

type DepositListParams = paths['/api/v1/deposits']['get']['parameters']['query'];

export class Deposits {
  constructor(private readonly client: APIClient) {}

  async list(params?: DepositListParams): Promise<DepositListResponse> {
    return this.client.get<DepositListResponse>('/deposits', params as Record<string, unknown>);
  }
}
