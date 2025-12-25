/**
 * PayCoinPro SDK Types
 */

export interface PayCoinProOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export type Currency = 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'BNB' | 'TRX' | string;

export type Network = 'ethereum' | 'bsc' | 'tron' | 'polygon' | 'arbitrum' | 'bitcoin' | string;

export type InvoiceStatus = 'pending' | 'processing' | 'completed' | 'expired' | 'cancelled' | 'underpaid' | 'overpaid';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DepositStatus = 'pending' | 'confirmed' | 'completed';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}

// Invoices
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
  amount: number;
  currency: Currency;
  network: Network;
  orderId?: string;
  description?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

export interface InvoiceListParams extends PaginationParams {
  status?: InvoiceStatus;
  currency?: Currency;
  orderId?: string;
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

// Deposit Addresses
export interface DepositAddress {
  id: string;
  address: string;
  asset: Currency;
  network: Network;
  label?: string;
  createdAt: string;
}

export interface DepositAddressCreateParams {
  asset: Currency;
  network: Network;
  label?: string;
}

export interface DepositAddressListParams extends PaginationParams {
  asset?: Currency;
  network?: Network;
}

// Deposits
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
  asset?: Currency;
  network?: Network;
  status?: DepositStatus;
  address?: string;
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

// Withdrawals
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
  amount: number;
  asset: Currency;
  network: Network;
  address: string;
  memo?: string;
}

export interface WithdrawalListParams extends PaginationParams {
  asset?: Currency;
  network?: Network;
  status?: WithdrawalStatus;
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

// API
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

export interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  idempotencyKey?: string;
}
