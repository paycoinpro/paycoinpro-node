import type { APIClient } from '../lib/api.js';
import type {
  MutationOptions,
  PublicCheckoutResource,
  PublicCheckoutSelectRequest,
  PublicCheckoutStatus,
  RequestOptions,
} from '../types/index.js';

/**
 * Hosted checkout endpoints, authorized by the opaque `pinv_*` capability in
 * the URL rather than by the merchant key. Safe to call from a customer-facing
 * server route.
 */
export class Checkouts {
  constructor(private readonly client: APIClient) {}

  retrieve(publicId: string, options?: RequestOptions): Promise<PublicCheckoutResource> {
    return this.client.get<PublicCheckoutResource>(
      `/public/checkouts/${encodeURIComponent(publicId)}`,
      undefined,
      options
    );
  }

  status(publicId: string, options?: RequestOptions): Promise<PublicCheckoutStatus> {
    return this.client.get<PublicCheckoutStatus>(
      `/public/checkouts/${encodeURIComponent(publicId)}/status`,
      undefined,
      options
    );
  }

  selectPaymentMethod(
    publicId: string,
    params: PublicCheckoutSelectRequest,
    options: MutationOptions
  ): Promise<PublicCheckoutResource> {
    return this.client.post<PublicCheckoutResource>(
      `/public/checkouts/${encodeURIComponent(publicId)}/select-payment-method`,
      params,
      options
    );
  }
}
