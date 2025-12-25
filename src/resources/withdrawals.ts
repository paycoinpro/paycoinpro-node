import type { APIClient } from '../lib/api.js';
import type { Withdrawal, WithdrawalCreateParams, WithdrawalListParams, PaginatedResponse } from '../types/index.js';

export class Withdrawals {
  constructor(private readonly client: APIClient) {}

  async create(params: WithdrawalCreateParams): Promise<Withdrawal> {
    return this.client.post<Withdrawal>('/withdrawals', params);
  }

  async list(params?: WithdrawalListParams): Promise<PaginatedResponse<Withdrawal>> {
    return this.client.get<PaginatedResponse<Withdrawal>, WithdrawalListParams>('/withdrawals', params);
  }
}
