/**
 * PayCoinPro SDK errors.
 *
 * Every non-2xx response becomes a PayCoinProAPIError carrying the V2 error
 * envelope verbatim. Retry classification is exposed, never acted on — a
 * mutation is only safe to retry with the caller's stable idempotency key.
 */

import type { ApiErrorCode } from '../types/index.js';

export interface ApiErrorDetail {
  path: string;
  code: string;
  message: string;
}

export class PayCoinProError extends Error {
  /** Whether retrying the identical request could succeed. */
  readonly retryable: boolean = false;

  constructor(message: string) {
    super(message);
    this.name = 'PayCoinProError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Codes where retrying the identical request can succeed. */
const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'PEV2_RATE_LIMITED',
  'PEV2_KILL_SWITCH_ACTIVE',
  'PEV2_INTERNAL',
]);

export class PayCoinProAPIError extends PayCoinProError {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly requestId: string;
  readonly details: readonly ApiErrorDetail[];
  override readonly retryable: boolean;

  constructor(input: {
    status: number;
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: readonly ApiErrorDetail[];
  }) {
    super(`${input.message} (${input.code}, request ${input.requestId})`);
    this.name = 'PayCoinProAPIError';
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details ?? [];
    this.retryable = RETRYABLE_CODES.has(input.code) || input.status >= 500;
  }

  /**
   * Build from a response body. Tolerates a non-conforming body: a proxy or
   * gateway can return HTML, and that must not crash the caller.
   */
  static fromResponse(status: number, body: unknown): PayCoinProAPIError {
    const envelope = (body ?? {}) as Partial<{
      code: ApiErrorCode;
      message: string;
      requestId: string;
      details: ApiErrorDetail[];
    }>;

    return new PayCoinProAPIError({
      status,
      code: envelope.code ?? 'PEV2_INTERNAL',
      message: envelope.message ?? `Request failed with status ${status}`,
      requestId: envelope.requestId ?? 'req_unknown',
      details: envelope.details,
    });
  }
}

export class TimeoutError extends PayCoinProError {
  override readonly retryable = true;

  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ConnectionError extends PayCoinProError {
  override readonly retryable = true;

  constructor(message = 'Connection failed') {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class WebhookVerificationError extends PayCoinProError {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}
