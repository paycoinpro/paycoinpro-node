import type { APIClient } from '../lib/api.js';
import type { Invoice, InvoiceCreateParams, InvoiceListParams, PaginatedResponse } from '../types/index.js';

export class Invoices {
  constructor(private readonly client: APIClient) {}

  async create(params: InvoiceCreateParams): Promise<Invoice> {
    return this.client.post<Invoice>('/invoices', params);
  }

  async retrieve(id: string): Promise<Invoice> {
    return this.client.get<Invoice>(`/invoices/${id}`);
  }

  async list(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
    return this.client.get<PaginatedResponse<Invoice>, InvoiceListParams>('/invoices', params);
  }
}
