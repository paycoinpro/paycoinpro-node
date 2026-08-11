import type { APIClient } from '../lib/api.js';
import type {
  CreateInvoiceRequest,
  DashboardInvoiceList,
  InvoiceEventBatch,
  InvoicePaymentsResponse,
  InvoiceResource,
  InvoiceStatus,
  MutationOptions,
  RequestOptions,
  SelectPaymentMethodRequest,
} from '../types/index.js';

export interface InvoiceListParams {
  after?: string;
  limit?: number;
  status?: InvoiceStatus;
}

export interface InvoiceEventParams {
  after?: string;
  limit?: number;
}

export class Invoices {
  constructor(private readonly client: APIClient) {}

  /**
   * Create an invoice. The returned invoice is REQUIRES_PAYMENT_METHOD until
   * selectPaymentMethod quotes an asset, a network, an address and an expiry.
   */
  create(params: CreateInvoiceRequest, options: MutationOptions): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>('/invoices', params, options);
  }

  retrieve(id: string, options?: RequestOptions): Promise<InvoiceResource> {
    return this.client.get<InvoiceResource>(
      `/invoices/${encodeURIComponent(id)}`,
      undefined,
      options
    );
  }

  list(params?: InvoiceListParams, options?: RequestOptions): Promise<DashboardInvoiceList> {
    return this.client.get<DashboardInvoiceList>(
      '/invoices',
      params as Record<string, unknown> | undefined,
      options
    );
  }

  /** Select asset and network, finalizing the invoice and quoting cryptoDue. */
  selectPaymentMethod(
    id: string,
    params: SelectPaymentMethodRequest,
    options: MutationOptions
  ): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>(
      `/invoices/${encodeURIComponent(id)}/select-payment-method`,
      params,
      options
    );
  }

  cancel(id: string, options: MutationOptions): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>(
      `/invoices/${encodeURIComponent(id)}/cancel`,
      undefined,
      options
    );
  }

  listPayments(id: string, options?: RequestOptions): Promise<InvoicePaymentsResponse> {
    return this.client.get<InvoicePaymentsResponse>(
      `/invoices/${encodeURIComponent(id)}/payments`,
      undefined,
      options
    );
  }

  /** Read durable invoice events from a reconnect cursor. */
  listEvents(
    id: string,
    params?: InvoiceEventParams,
    options?: RequestOptions
  ): Promise<InvoiceEventBatch> {
    return this.client.get<InvoiceEventBatch>(
      `/invoices/${encodeURIComponent(id)}/events`,
      params as Record<string, unknown> | undefined,
      options
    );
  }
}
