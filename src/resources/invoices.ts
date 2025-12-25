/**
 * Invoices Resource
 */

import type { APIClient } from '../lib/api.js';
import type {
  Invoice,
  InvoiceCreateParams,
  InvoiceListParams,
  PaginatedResponse,
  RequestOptions,
} from '../types/index.js';

export class Invoices {
  constructor(private readonly client: APIClient) {}

  /**
   * Create a new invoice
   *
   * @param params - Invoice creation parameters
   * @param options - Request options
   * @returns The created invoice
   *
   * @example
   * ```typescript
   * const invoice = await client.invoices.create({
   *   amount: 99.99,
   *   currency: 'USDT',
   *   network: 'bsc',
   *   orderId: 'ORD-123',
   *   redirectUrl: 'https://store.com/success',
   *   webhookUrl: 'https://store.com/webhooks',
   * });
   * ```
   */
  async create(params: InvoiceCreateParams, options?: RequestOptions): Promise<Invoice> {
    return this.client.post<Invoice>('/invoices', params, options);
  }

  /**
   * Retrieve an invoice by ID
   *
   * @param id - The invoice ID
   * @param options - Request options
   * @returns The invoice
   *
   * @example
   * ```typescript
   * const invoice = await client.invoices.retrieve('inv_abc123');
   * ```
   */
  async retrieve(id: string, options?: RequestOptions): Promise<Invoice> {
    return this.client.get<Invoice>(`/invoices/${encodeURIComponent(id)}`, undefined, options);
  }

  /**
   * List invoices with optional filtering
   *
   * @param params - List parameters and filters
   * @param options - Request options
   * @returns Paginated list of invoices
   *
   * @example
   * ```typescript
   * const invoices = await client.invoices.list({ limit: 10 });
   *
   * // Filter by status
   * const completed = await client.invoices.list({
   *   status: 'completed',
   *   limit: 20,
   * });
   * ```
   */
  async list(
    params?: InvoiceListParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<Invoice>> {
    return this.client.get<PaginatedResponse<Invoice>, InvoiceListParams>(
      '/invoices',
      params,
      options
    );
  }
}
