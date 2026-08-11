import type { APIClient } from '../lib/api.js';
import type {
  ApprovePayoutRequest,
  CancelPayoutRequest,
  CreatePayoutRequest,
  MutationOptions,
  PayoutList,
  PayoutMutationOptions,
  PayoutResource,
  PayoutStatus,
  RequestOptions,
} from '../types/index.js';

export interface PayoutListParams {
  status?: PayoutStatus;
  limit?: number;
  offset?: number;
}

const TOTP_PATTERN = /^[0-9]{6}$/;

export class Payouts {
  constructor(private readonly client: APIClient) {}

  /**
   * Create a payout.
   *
   * Requires a fresh six-digit owner TOTP, supplied per call. It is sent as the
   * X-Payout-2FA header, never persisted, never logged, never in the body.
   * Creation is not completion — track a terminal payout state.
   *
   * `async` so the TOTP guard rejects rather than throwing synchronously.
   */
  async create(
    params: CreatePayoutRequest,
    options: PayoutMutationOptions
  ): Promise<PayoutResource> {
    if (!TOTP_PATTERN.test(options?.totp ?? '')) {
      throw new Error('Payout creation requires a fresh six-digit owner TOTP');
    }
    return this.client.post<PayoutResource>('/payouts', params, options);
  }

  retrieve(id: string, options?: RequestOptions): Promise<PayoutResource> {
    return this.client.get<PayoutResource>(
      `/payouts/${encodeURIComponent(id)}`,
      undefined,
      options
    );
  }

  list(params?: PayoutListParams, options?: RequestOptions): Promise<PayoutList> {
    return this.client.get<PayoutList>(
      '/payouts',
      params as Record<string, unknown> | undefined,
      options
    );
  }

  /**
   * Approve or reject a payout.
   *
   * The second factor here is `twoFactorToken` in the request body — a separate
   * mechanism from create's X-Payout-2FA header. Both are owner-supplied and
   * neither may be cached.
   */
  decide(
    id: string,
    params: ApprovePayoutRequest,
    options: MutationOptions
  ): Promise<PayoutResource> {
    return this.client.post<PayoutResource>(
      `/payouts/${encodeURIComponent(id)}/decision`,
      params,
      options
    );
  }

  /** Cancel a payout before signing. `reason` is required by the API. */
  cancel(id: string, params: CancelPayoutRequest, options: MutationOptions): Promise<PayoutResource> {
    return this.client.post<PayoutResource>(
      `/payouts/${encodeURIComponent(id)}/cancel`,
      params,
      options
    );
  }
}
