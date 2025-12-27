/**
 * PayCoinPro SDK Types
 *
 * Types are auto-generated from OpenAPI spec.
 * Run `npm run generate` to update.
 */

// SDK Configuration (not from API)
export interface PayCoinProOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  idempotencyKey?: string;
}

// Internal API response wrapper
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

// Re-export all auto-generated OpenAPI types
export type { paths, components, operations } from './openapi.js';

// Convenience type aliases from OpenAPI schemas
import type { components } from './openapi.js';

// Invoices
export type Invoice = components['schemas']['Invoice'];
export type InvoiceCreated = components['schemas']['InvoiceCreated'];
export type CreateInvoiceRequest = components['schemas']['CreateInvoiceRequest'];
export type InvoiceListResponse = components['schemas']['InvoiceListResponse'];
export type InvoiceStatus = Invoice['status'];

// Deposit Addresses
export type DepositAddress = components['schemas']['DepositAddress'];
export type DepositAddressCreated = components['schemas']['DepositAddressCreated'];
export type CreateDepositAddressRequest = components['schemas']['CreateDepositAddressRequest'];
export type DepositAddressListResponse = components['schemas']['DepositAddressListResponse'];

// Deposits
export type Deposit = components['schemas']['Deposit'];
export type DepositListResponse = components['schemas']['DepositListResponse'];

// Assets
export type Asset = components['schemas']['Asset'];
export type AssetNetwork = components['schemas']['AssetNetwork'];
export type AssetListResponse = components['schemas']['AssetListResponse'];

// Webhooks
export type WebhookPayload = components['schemas']['WebhookPayload'];
export type DepositWebhookPayload = components['schemas']['DepositWebhookPayload'];

// Common
export type Pagination = components['schemas']['Pagination'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
