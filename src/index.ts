/**
 * PayCoinPro Node.js SDK
 *
 * Types are auto-generated from OpenAPI spec.
 * Run `npm run generate` to update types.
 */

export { PayCoinPro, PayCoinPro as default } from './client.js';

// SDK Configuration
export type { PayCoinProOptions, RequestOptions } from './types/index.js';

// API Types (auto-generated from OpenAPI)
export type {
  // Full OpenAPI types
  paths,
  components,
  operations,
  // Invoices
  Invoice,
  InvoiceCreated,
  CreateInvoiceRequest,
  InvoiceListResponse,
  InvoiceStatus,
  // Deposit Addresses
  DepositAddress,
  DepositAddressCreated,
  CreateDepositAddressRequest,
  DepositAddressListResponse,
  // Deposits
  Deposit,
  DepositListResponse,
  // Assets
  Asset,
  AssetNetwork,
  AssetListResponse,
  // Webhooks
  WebhookPayload,
  DepositWebhookPayload,
  // Common
  Pagination,
  ErrorResponse,
} from './types/index.js';

// Errors
export {
  PayCoinProError,
  APIError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ConnectionError,
} from './lib/errors.js';

export { WebhookVerificationError } from './resources/webhooks.js';
export type { WebhookEvent } from './resources/webhooks.js';
