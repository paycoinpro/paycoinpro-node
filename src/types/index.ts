/**
 * PayCoinPro SDK Types
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface PayCoinProOptions {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Base URL for the API (defaults to https://paycoinpro.com/api/v1)
   */
  baseURL?: string;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Maximum number of retries for failed requests (default: 2)
   */
  maxRetries?: number;

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;

  /**
   * Custom fetch implementation (for testing or custom environments)
   */
  fetch?: typeof fetch;

  /**
   * Default headers to include in all requests
   */
  defaultHeaders?: Record<string, string>;
}

// ============================================================================
// Common Types
// ============================================================================

export type Currency = 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'BNB' | 'TRX' | string;

export type Network =
  | 'ethereum'
  | 'bsc'
  | 'tron'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'bitcoin'
  | string;

export type InvoiceStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'underpaid'
  | 'overpaid';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DepositStatus = 'pending' | 'confirmed' | 'completed';

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  /**
   * Number of items to return (default: 20, max: 100)
   */
  limit?: number;

  /**
   * Number of items to skip
   */
  offset?: number;

  /**
   * Cursor for cursor-based pagination
   */
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
  cursor?: string;
}

// ============================================================================
// Invoices
// ============================================================================

export interface Invoice {
  id: string;
  amount: number;
  currency: Currency;
  network: Network;
  status: InvoiceStatus;
  orderId?: string;
  description?: string;
  paymentAddress: string;
  paymentAmount: number;
  paidAmount: number;
  redirectUrl?: string;
  webhookUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceCreateParams {
  /**
   * Amount to charge
   */
  amount: number;

  /**
   * Currency (e.g., 'USDT', 'BTC')
   */
  currency: Currency;

  /**
   * Blockchain network (e.g., 'bsc', 'ethereum', 'tron')
   */
  network: Network;

  /**
   * Your internal order ID
   */
  orderId?: string;

  /**
   * Description of the invoice
   */
  description?: string;

  /**
   * URL to redirect after payment
   */
  redirectUrl?: string;

  /**
   * URL to receive webhook notifications
   */
  webhookUrl?: string;

  /**
   * Invoice expiration time in minutes (default: 60)
   */
  expiresIn?: number;

  /**
   * Custom metadata to attach to the invoice
   */
  metadata?: Record<string, unknown>;
}

export interface InvoiceListParams extends PaginationParams {
  /**
   * Filter by status
   */
  status?: InvoiceStatus;

  /**
   * Filter by currency
   */
  currency?: Currency;

  /**
   * Filter by order ID
   */
  orderId?: string;

  /**
   * Filter invoices created after this date
   */
  createdAfter?: string | Date;

  /**
   * Filter invoices created before this date
   */
  createdBefore?: string | Date;
}

// ============================================================================
// Deposit Addresses
// ============================================================================

export interface DepositAddress {
  id: string;
  address: string;
  asset: Currency;
  network: Network;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositAddressCreateParams {
  /**
   * Asset to receive (e.g., 'USDT', 'BTC')
   */
  asset: Currency;

  /**
   * Blockchain network
   */
  network: Network;

  /**
   * Optional label for the address
   */
  label?: string;
}

export interface DepositAddressListParams extends PaginationParams {
  /**
   * Filter by asset
   */
  asset?: Currency;

  /**
   * Filter by network
   */
  network?: Network;
}

// ============================================================================
// Deposits
// ============================================================================

export interface Deposit {
  id: string;
  txHash: string;
  address: string;
  amount: number;
  asset: Currency;
  network: Network;
  status: DepositStatus;
  confirmations: number;
  requiredConfirmations: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface DepositListParams extends PaginationParams {
  /**
   * Filter by asset
   */
  asset?: Currency;

  /**
   * Filter by network
   */
  network?: Network;

  /**
   * Filter by status
   */
  status?: DepositStatus;

  /**
   * Filter by deposit address
   */
  address?: string;

  /**
   * Filter deposits created after this date
   */
  createdAfter?: string | Date;

  /**
   * Filter deposits created before this date
   */
  createdBefore?: string | Date;
}

// ============================================================================
// Balances
// ============================================================================

export interface Balance {
  asset: Currency;
  available: number;
  pending: number;
  total: number;
}

export interface BalanceListParams {
  /**
   * Filter by specific assets
   */
  assets?: Currency[];
}

// ============================================================================
// Withdrawals
// ============================================================================

export interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  asset: Currency;
  network: Network;
  address: string;
  txHash?: string;
  status: WithdrawalStatus;
  memo?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WithdrawalCreateParams {
  /**
   * Amount to withdraw
   */
  amount: number;

  /**
   * Asset to withdraw (e.g., 'USDT', 'BTC')
   */
  asset: Currency;

  /**
   * Blockchain network
   */
  network: Network;

  /**
   * Destination address
   */
  address: string;

  /**
   * Memo/tag for networks that require it (e.g., XRP, XLM)
   */
  memo?: string;
}

export interface WithdrawalListParams extends PaginationParams {
  /**
   * Filter by asset
   */
  asset?: Currency;

  /**
   * Filter by network
   */
  network?: Network;

  /**
   * Filter by status
   */
  status?: WithdrawalStatus;

  /**
   * Filter withdrawals created after this date
   */
  createdAfter?: string | Date;

  /**
   * Filter withdrawals created before this date
   */
  createdBefore?: string | Date;
}

// ============================================================================
// Webhooks
// ============================================================================

export type WebhookEventType =
  | 'invoice.created'
  | 'invoice.processing'
  | 'invoice.completed'
  | 'invoice.expired'
  | 'invoice.underpaid'
  | 'invoice.overpaid'
  | 'deposit.pending'
  | 'deposit.confirmed'
  | 'deposit.completed'
  | 'withdrawal.pending'
  | 'withdrawal.processing'
  | 'withdrawal.completed'
  | 'withdrawal.failed';

export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  data: T;
  createdAt: string;
}

export interface WebhookInvoiceEvent extends WebhookEvent<Invoice> {
  type:
    | 'invoice.created'
    | 'invoice.processing'
    | 'invoice.completed'
    | 'invoice.expired'
    | 'invoice.underpaid'
    | 'invoice.overpaid';
}

export interface WebhookDepositEvent extends WebhookEvent<Deposit> {
  type: 'deposit.pending' | 'deposit.confirmed' | 'deposit.completed';
}

export interface WebhookWithdrawalEvent extends WebhookEvent<Withdrawal> {
  type: 'withdrawal.pending' | 'withdrawal.processing' | 'withdrawal.completed' | 'withdrawal.failed';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: APIErrorResponse;
}

export interface APIErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Request Options
// ============================================================================

export interface RequestOptions {
  /**
   * Override timeout for this request
   */
  timeout?: number;

  /**
   * Override max retries for this request
   */
  maxRetries?: number;

  /**
   * Additional headers for this request
   */
  headers?: Record<string, string>;

  /**
   * AbortSignal for request cancellation
   */
  signal?: AbortSignal;

  /**
   * Idempotency key for safe retries
   */
  idempotencyKey?: string;
}
