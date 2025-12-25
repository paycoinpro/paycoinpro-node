/**
 * PayCoinPro Node.js SDK
 *
 * Official TypeScript/JavaScript SDK for the PayCoinPro payment gateway.
 *
 * @packageDocumentation
 * @module paycoinpro
 *
 * @example
 * ```typescript
 * import PayCoinPro from 'paycoinpro';
 *
 * const client = new PayCoinPro({
 *   apiKey: 'pk_live_...',
 * });
 *
 * // Create an invoice
 * const invoice = await client.invoices.create({
 *   amount: 99.99,
 *   currency: 'USDT',
 *   network: 'bsc',
 *   orderId: 'ORD-123',
 * });
 *
 * console.log(invoice.paymentAddress);
 * ```
 */

// Main client
export { PayCoinPro, PayCoinPro as default } from './client.js';

// Types
export type {
  // Client options
  PayCoinProOptions,
  RequestOptions,

  // Common types
  Currency,
  Network,
  InvoiceStatus,
  WithdrawalStatus,
  DepositStatus,

  // Pagination
  PaginationParams,
  PaginatedResponse,

  // Invoices
  Invoice,
  InvoiceCreateParams,
  InvoiceListParams,

  // Deposit addresses
  DepositAddress,
  DepositAddressCreateParams,
  DepositAddressListParams,

  // Deposits
  Deposit,
  DepositListParams,

  // Balances
  Balance,
  BalanceListParams,

  // Withdrawals
  Withdrawal,
  WithdrawalCreateParams,
  WithdrawalListParams,

  // Webhooks
  WebhookEvent,
  WebhookEventType,
  WebhookInvoiceEvent,
  WebhookDepositEvent,
  WebhookWithdrawalEvent,

  // API
  APIResponse,
  APIErrorResponse,
} from './types/index.js';

// Errors
export {
  PayCoinProError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  TimeoutError,
  ConnectionError,
  WebhookSignatureError,
} from './lib/errors.js';

// Webhook utilities
export { getSignatureFromHeaders } from './lib/webhooks.js';
