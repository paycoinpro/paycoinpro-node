/**
 * PayCoinPro SDK Types
 *
 * API types are auto-generated from the Payment Engine V2 OpenAPI document.
 * Run `npm run generate` to update.
 */

export type { paths, components, operations } from './openapi.js';

import type { components } from './openapi.js';

type Schemas = components['schemas'];

// Catalogue
export type AssetCatalogResponse = Schemas['AssetCatalogResponse'];
export type CatalogAsset = AssetCatalogResponse['assets'][number];

// Invoices
export type InvoiceResource = Schemas['InvoiceResource'];
export type CreateInvoiceRequest = Schemas['CreateInvoiceRequest'];
export type SelectPaymentMethodRequest = Schemas['SelectPaymentMethodRequest'];
export type InvoiceStatus = Schemas['InvoiceStatus'];
export type DashboardInvoiceList = Schemas['DashboardInvoiceList'];
export type InvoicePaymentsResponse = Schemas['InvoicePaymentsResponse'];
export type InvoiceEventBatch = Schemas['InvoiceEventBatch'];

// Ledger
export type BalancesResponse = Schemas['BalancesResponse'];
export type LedgerTransactionsResponse = Schemas['LedgerTransactionsResponse'];

// Payouts
export type CreatePayoutRequest = Schemas['CreatePayoutRequest'];
export type ApprovePayoutRequest = Schemas['ApprovePayoutRequest'];
export type CancelPayoutRequest = Schemas['CancelPayoutRequest'];
export type PayoutResource = Schemas['PayoutResource'];
export type PayoutStatus = Schemas['PayoutStatus'];
export type PayoutList = Schemas['PayoutList'];

// Public checkout
export type PublicCheckoutResource = Schemas['PublicCheckoutResource'];
export type PublicCheckoutStatus = Schemas['PublicCheckoutStatus'];
export type PublicCheckoutSelectRequest = Schemas['PublicCheckoutSelectRequest'];

// Webhook endpoints
export type CreateWebhookEndpointRequest = Schemas['CreateWebhookEndpointRequest'];
export type UpdateWebhookEndpointRequest = Schemas['UpdateWebhookEndpointRequest'];
export type RotateWebhookSecretRequest = Schemas['RotateWebhookSecretRequest'];
export type WebhookEndpointResource = Schemas['WebhookEndpointResource'];
export type WebhookEndpointList = Schemas['WebhookEndpointList'];
export type WebhookRedeliveryAccepted = Schemas['WebhookRedeliveryAccepted'];

// Errors
export type ApiError = Schemas['ApiError'];
export type ApiErrorCode = ApiError['code'];

// SDK configuration (not from the API)
export interface PayCoinProOptions {
  /** Merchant API key: `ck_test_…` or `ck_live_…`. */
  apiKey: string;
  /** API origin. The SDK appends `/api/v2`. */
  baseURL?: string;
  timeout?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface PayoutClientOptions {
  /** Payout credential: `pc_test_…` or `pc_live_…`. */
  credential: string;
  baseURL?: string;
  timeout?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface MutationOptions extends RequestOptions {
  /**
   * Required. Must be stable across retries of the same logical operation and
   * persisted alongside the record it belongs to.
   */
  idempotencyKey: string;
}

export interface PayoutMutationOptions extends MutationOptions {
  /** Fresh six-digit owner TOTP. Never cached, never persisted. */
  totp: string;
}
