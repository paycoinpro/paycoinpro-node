import type { APIClient } from '../lib/api.js';
import type {
  Invoice,
  InvoiceCreated,
  CreateInvoiceRequest,
  InvoiceListResponse,
  paths,
} from '../types/index.js';

type InvoiceListParams = paths['/api/v1/invoices']['get']['parameters']['query'];

export class Invoices {
  constructor(private readonly client: APIClient) {}

  async create(params: CreateInvoiceRequest): Promise<InvoiceCreated> {
    return this.client.post<InvoiceCreated>('/invoices', params);
  }

  async retrieve(id: string): Promise<Invoice> {
    return this.client.get<Invoice>(`/invoices/${id}`);
  }

  async list(params?: InvoiceListParams): Promise<InvoiceListResponse> {
    return this.client.get<InvoiceListResponse>('/invoices', params as Record<string, unknown>);
  }
}
