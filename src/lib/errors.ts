/**
 * PayCoinPro SDK Errors
 */

export class PayCoinProError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayCoinProError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends PayCoinProError {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string = 'api_error') {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }

  static fromResponse(status: number, error?: { code: string; message: string }): APIError {
    const message = error?.message ?? `Request failed with status ${status}`;
    const code = error?.code ?? 'unknown_error';

    switch (status) {
      case 400:
        return new BadRequestError(message, code);
      case 401:
        return new AuthenticationError(message, code);
      case 404:
        return new NotFoundError(message, code);
      case 429:
        return new RateLimitError(message, code);
      default:
        return new APIError(message, status, code);
    }
  }
}

export class BadRequestError extends APIError {
  constructor(message: string, code: string = 'bad_request') {
    super(message, 400, code);
    this.name = 'BadRequestError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, code: string = 'authentication_error') {
    super(message, 401, code);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string, code: string = 'not_found') {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string, code: string = 'rate_limit') {
    super(message, 429, code);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends PayCoinProError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ConnectionError extends PayCoinProError {
  constructor(message: string = 'Connection failed') {
    super(message);
    this.name = 'ConnectionError';
  }
}
