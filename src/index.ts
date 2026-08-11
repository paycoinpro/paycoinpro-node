/**
 * PayCoinPro Node.js SDK — Payment Engine V2.
 *
 * API types are auto-generated from the OpenAPI document.
 * Run `npm run generate` to update them.
 */

export { PayCoinPro, PayCoinPro as default } from './client.js';
export { PayCoinProPayouts } from './payout-client.js';

// Helpers
export { idempotencyKeyFor } from './lib/idempotency.js';
export { formatAmount } from './lib/money.js';

// Errors
export {
  PayCoinProError,
  PayCoinProAPIError,
  TimeoutError,
  ConnectionError,
  WebhookVerificationError,
} from './lib/errors.js';
export type { ApiErrorDetail } from './lib/errors.js';

// Webhook helpers
export { Webhooks } from './resources/webhooks.js';
export type { WebhookEvent, WebhookHeaders } from './resources/webhooks.js';

// Resource parameter types
export type { InvoiceListParams, InvoiceEventParams } from './resources/invoices.js';
export type { LedgerListParams } from './resources/ledger.js';
export type { PayoutListParams } from './resources/payouts.js';

// SDK configuration
export type {
  PayCoinProOptions,
  PayoutClientOptions,
  RequestOptions,
  MutationOptions,
  PayoutMutationOptions,
} from './types/index.js';

// API types
export type {
  paths,
  components,
  operations,
  AssetCatalogResponse,
  CatalogAsset,
  InvoiceResource,
  CreateInvoiceRequest,
  SelectPaymentMethodRequest,
  InvoiceStatus,
  DashboardInvoiceList,
  InvoicePaymentsResponse,
  InvoiceEventBatch,
  BalancesResponse,
  LedgerTransactionsResponse,
  CreatePayoutRequest,
  ApprovePayoutRequest,
  CancelPayoutRequest,
  PayoutResource,
  PayoutStatus,
  PayoutList,
  PublicCheckoutResource,
  PublicCheckoutStatus,
  PublicCheckoutSelectRequest,
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  RotateWebhookSecretRequest,
  WebhookEndpointResource,
  WebhookEndpointList,
  WebhookRedeliveryAccepted,
  ApiError,
  ApiErrorCode,
} from './types/index.js';
