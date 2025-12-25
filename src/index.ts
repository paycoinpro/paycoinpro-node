/**
 * PayCoinPro Node.js SDK
 */

export { PayCoinPro, PayCoinPro as default } from './client.js';

export type {
  PayCoinProOptions,
  RequestOptions,
  Currency,
  Network,
  InvoiceStatus,
  WithdrawalStatus,
  DepositStatus,
  PaginationParams,
  PaginatedResponse,
  Invoice,
  InvoiceCreateParams,
  InvoiceListParams,
  DepositAddress,
  DepositAddressCreateParams,
  DepositAddressListParams,
  Deposit,
  DepositListParams,
  Withdrawal,
  WithdrawalCreateParams,
  WithdrawalListParams,
} from './types/index.js';

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
