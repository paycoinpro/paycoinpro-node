import { describe, it, expect } from 'vitest';
import {
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
} from '../src/lib/errors.js';

describe('Errors', () => {
  describe('PayCoinProError', () => {
    it('should create error with message', () => {
      const error = new PayCoinProError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PayCoinProError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('PayCoinProError');
    });
  });

  describe('APIError', () => {
    it('should create error with all properties', () => {
      const headers = new Headers();
      headers.set('x-request-id', 'req_123');

      const error = new APIError(
        'Request failed',
        400,
        'bad_request',
        headers,
        { field: 'amount' }
      );

      expect(error.message).toBe('Request failed');
      expect(error.status).toBe(400);
      expect(error.code).toBe('bad_request');
      expect(error.headers).toBe(headers);
      expect(error.details).toEqual({ field: 'amount' });
      expect(error.requestId).toBe('req_123');
    });

    it('should handle missing request ID', () => {
      const headers = new Headers();
      const error = new APIError('Error', 500, 'error', headers);

      expect(error.requestId).toBeUndefined();
    });

    describe('fromResponse', () => {
      const headers = new Headers();

      it('should return BadRequestError for 400', () => {
        const error = APIError.fromResponse(400, headers, {
          code: 'validation_error',
          message: 'Invalid input',
        });

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.status).toBe(400);
      });

      it('should return AuthenticationError for 401', () => {
        const error = APIError.fromResponse(401, headers, {
          code: 'invalid_api_key',
          message: 'Invalid API key',
        });

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.status).toBe(401);
      });

      it('should return PermissionDeniedError for 403', () => {
        const error = APIError.fromResponse(403, headers);

        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect(error.status).toBe(403);
      });

      it('should return NotFoundError for 404', () => {
        const error = APIError.fromResponse(404, headers, {
          code: 'not_found',
          message: 'Invoice not found',
        });

        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.status).toBe(404);
      });

      it('should return ConflictError for 409', () => {
        const error = APIError.fromResponse(409, headers);

        expect(error).toBeInstanceOf(ConflictError);
        expect(error.status).toBe(409);
      });

      it('should return UnprocessableEntityError for 422', () => {
        const error = APIError.fromResponse(422, headers);

        expect(error).toBeInstanceOf(UnprocessableEntityError);
        expect(error.status).toBe(422);
      });

      it('should return RateLimitError for 429', () => {
        const headersWithRetry = new Headers();
        headersWithRetry.set('retry-after', '30');

        const error = APIError.fromResponse(429, headersWithRetry) as RateLimitError;

        expect(error).toBeInstanceOf(RateLimitError);
        expect(error.status).toBe(429);
        expect(error.retryAfter).toBe(30);
      });

      it('should return InternalServerError for 500', () => {
        const error = APIError.fromResponse(500, headers);

        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.status).toBe(500);
      });

      it('should return InternalServerError for 502', () => {
        const error = APIError.fromResponse(502, headers);

        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.status).toBe(502);
      });

      it('should return InternalServerError for 503', () => {
        const error = APIError.fromResponse(503, headers);

        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.status).toBe(503);
      });

      it('should return generic APIError for other status codes', () => {
        const error = APIError.fromResponse(418, headers);

        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(418);
      });

      it('should use default message when not provided', () => {
        const error = APIError.fromResponse(500, headers);

        expect(error.message).toBe('Request failed with status 500');
        expect(error.code).toBe('unknown_error');
      });
    });
  });

  describe('TimeoutError', () => {
    it('should create error with default message', () => {
      const error = new TimeoutError();

      expect(error).toBeInstanceOf(PayCoinProError);
      expect(error.message).toBe('Request timed out');
      expect(error.name).toBe('TimeoutError');
    });

    it('should create error with custom message', () => {
      const error = new TimeoutError('Custom timeout message');

      expect(error.message).toBe('Custom timeout message');
    });
  });

  describe('ConnectionError', () => {
    it('should create error with default message', () => {
      const error = new ConnectionError();

      expect(error).toBeInstanceOf(PayCoinProError);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('ConnectionError');
    });

    it('should create error with custom message', () => {
      const error = new ConnectionError('Network unreachable');

      expect(error.message).toBe('Network unreachable');
    });
  });

  describe('WebhookSignatureError', () => {
    it('should create error with default message', () => {
      const error = new WebhookSignatureError();

      expect(error).toBeInstanceOf(PayCoinProError);
      expect(error.message).toBe('Invalid webhook signature');
      expect(error.name).toBe('WebhookSignatureError');
    });

    it('should create error with custom message', () => {
      const error = new WebhookSignatureError('Signature mismatch');

      expect(error.message).toBe('Signature mismatch');
    });
  });
});
