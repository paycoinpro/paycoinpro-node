/**
 * PayCoinPro SDK Errors
 */

import type { APIErrorResponse } from '../types/index.js';

/**
 * Base error class for all PayCoinPro SDK errors
 */
export class PayCoinProError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayCoinProError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when an API request fails
 */
export class APIError extends PayCoinProError {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  readonly headers: Headers;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    status: number,
    code: string,
    headers: Headers,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
    this.requestId = headers.get('x-request-id') ?? undefined;
  }

  static fromResponse(
    status: number,
    headers: Headers,
    error?: APIErrorResponse
  ): APIError {
    const message = error?.message ?? `Request failed with status ${status}`;
    const code = error?.code ?? 'unknown_error';
    const details = error?.details;

    // Return specific error types based on status code
    switch (status) {
      case 400:
        return new BadRequestError(message, headers, code, details);
      case 401:
        return new AuthenticationError(message, headers, code, details);
      case 403:
        return new PermissionDeniedError(message, headers, code, details);
      case 404:
        return new NotFoundError(message, headers, code, details);
      case 409:
        return new ConflictError(message, headers, code, details);
      case 422:
        return new UnprocessableEntityError(message, headers, code, details);
      case 429:
        return new RateLimitError(message, headers, code, details);
      case 500:
      case 502:
      case 503:
      case 504:
        return new InternalServerError(message, status, headers, code, details);
      default:
        return new APIError(message, status, code, headers, details);
    }
  }
}

/**
 * Error thrown when the request is malformed
 */
export class BadRequestError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'bad_request',
    details?: Record<string, unknown>
  ) {
    super(message, 400, code, headers, details);
    this.name = 'BadRequestError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'authentication_error',
    details?: Record<string, unknown>
  ) {
    super(message, 401, code, headers, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when the user doesn't have permission
 */
export class PermissionDeniedError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'permission_denied',
    details?: Record<string, unknown>
  ) {
    super(message, 403, code, headers, details);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'not_found',
    details?: Record<string, unknown>
  ) {
    super(message, 404, code, headers, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when there's a conflict (e.g., duplicate resource)
 */
export class ConflictError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'conflict',
    details?: Record<string, unknown>
  ) {
    super(message, 409, code, headers, details);
    this.name = 'ConflictError';
  }
}

/**
 * Error thrown when validation fails
 */
export class UnprocessableEntityError extends APIError {
  constructor(
    message: string,
    headers: Headers,
    code: string = 'unprocessable_entity',
    details?: Record<string, unknown>
  ) {
    super(message, 422, code, headers, details);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends APIError {
  readonly retryAfter: number | undefined;

  constructor(
    message: string,
    headers: Headers,
    code: string = 'rate_limit_exceeded',
    details?: Record<string, unknown>
  ) {
    super(message, 429, code, headers, details);
    this.name = 'RateLimitError';

    const retryAfterHeader = headers.get('retry-after');
    if (retryAfterHeader) {
      this.retryAfter = parseInt(retryAfterHeader, 10);
    }
  }
}

/**
 * Error thrown when the server returns an error
 */
export class InternalServerError extends APIError {
  constructor(
    message: string,
    status: number,
    headers: Headers,
    code: string = 'internal_server_error',
    details?: Record<string, unknown>
  ) {
    super(message, status, code, headers, details);
    this.name = 'InternalServerError';
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends PayCoinProError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when a network error occurs
 */
export class ConnectionError extends PayCoinProError {
  constructor(message: string = 'Connection failed') {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when webhook signature verification fails
 */
export class WebhookSignatureError extends PayCoinProError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}
