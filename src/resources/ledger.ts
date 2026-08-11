import type { APIClient } from '../lib/api.js';
import type { LedgerTransactionsResponse, RequestOptions } from '../types/index.js';

export interface LedgerListParams {
  before?: string;
  limit?: number;
}

export class Ledger {
  constructor(private readonly client: APIClient) {}

  /** List immutable ledger transactions affecting the merchant. */
  listTransactions(
    params?: LedgerListParams,
    options?: RequestOptions
  ): Promise<LedgerTransactionsResponse> {
    return this.client.get<LedgerTransactionsResponse>(
      '/ledger/transactions',
      params as Record<string, unknown> | undefined,
      options
    );
  }
}
