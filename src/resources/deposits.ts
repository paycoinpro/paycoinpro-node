import type { APIClient } from '../lib/api.js';
import type { Deposit, DepositListParams, PaginatedResponse } from '../types/index.js';

export class Deposits {
  constructor(private readonly client: APIClient) {}

  async list(params?: DepositListParams): Promise<PaginatedResponse<Deposit>> {
    return this.client.get<PaginatedResponse<Deposit>, DepositListParams>('/deposits', params);
  }
}
