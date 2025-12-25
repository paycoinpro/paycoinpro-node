import { describe, it, expect } from 'vitest';
import {
  PayCoinProError,
  APIError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ConnectionError,
} from '../src/lib/errors.js';

describe('Errors', () => {
  it('should create PayCoinProError', () => {
    const error = new PayCoinProError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('PayCoinProError');
  });

  it('should create APIError with status and code', () => {
    const error = new APIError('Bad request', 400, 'bad_request');
    expect(error.status).toBe(400);
    expect(error.code).toBe('bad_request');
  });

  it('should create correct error type from status code', () => {
    expect(APIError.fromResponse(400)).toBeInstanceOf(BadRequestError);
    expect(APIError.fromResponse(401)).toBeInstanceOf(AuthenticationError);
    expect(APIError.fromResponse(404)).toBeInstanceOf(NotFoundError);
    expect(APIError.fromResponse(429)).toBeInstanceOf(RateLimitError);
    expect(APIError.fromResponse(500)).toBeInstanceOf(APIError);
  });

  it('should create TimeoutError', () => {
    const error = new TimeoutError();
    expect(error.message).toBe('Request timed out');
  });

  it('should create ConnectionError', () => {
    const error = new ConnectionError();
    expect(error.message).toBe('Connection failed');
  });
});
