import { describe, expect, it } from 'vitest';
import {
  PayCoinProAPIError,
  PayCoinProError,
  TimeoutError,
  ConnectionError,
} from '../src/lib/errors.js';

const envelope = (code: string) => ({
  code,
  message: 'boom',
  requestId: 'req_abc12345',
  details: [{ path: 'fiatAmount', code: 'invalid', message: 'bad' }],
});

describe('PayCoinProAPIError.fromResponse', () => {
  it('carries code, message, requestId and details', () => {
    const error = PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR'));
    expect(error).toBeInstanceOf(PayCoinProError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('PEV2_VALIDATION_ERROR');
    expect(error.requestId).toBe('req_abc12345');
    expect(error.details).toHaveLength(1);
  });

  it('includes the request id in the message so it can be quoted in support', () => {
    const error = PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR'));
    expect(error.message).toContain('req_abc12345');
  });

  it('marks rate limiting and internal errors retryable', () => {
    expect(PayCoinProAPIError.fromResponse(429, envelope('PEV2_RATE_LIMITED')).retryable).toBe(true);
    expect(PayCoinProAPIError.fromResponse(500, envelope('PEV2_INTERNAL')).retryable).toBe(true);
  });

  it('marks validation and conflict errors not retryable', () => {
    expect(PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR')).retryable).toBe(
      false
    );
    expect(
      PayCoinProAPIError.fromResponse(409, envelope('PEV2_IDEMPOTENCY_CONFLICT')).retryable
    ).toBe(false);
    expect(PayCoinProAPIError.fromResponse(409, envelope('PEV2_ORDER_ID_CONFLICT')).retryable).toBe(
      false
    );
    expect(PayCoinProAPIError.fromResponse(409, envelope('PEV2_INVALID_TRANSITION')).retryable).toBe(
      false
    );
    expect(PayCoinProAPIError.fromResponse(422, envelope('PEV2_QUOTE_EXPIRED')).retryable).toBe(
      false
    );
  });

  it('treats the kill switch as retryable — the pause is temporary', () => {
    expect(
      PayCoinProAPIError.fromResponse(503, envelope('PEV2_KILL_SWITCH_ACTIVE')).retryable
    ).toBe(true);
  });

  it('survives a non-conforming body without throwing', () => {
    const error = PayCoinProAPIError.fromResponse(502, undefined);
    expect(error.status).toBe(502);
    expect(error.code).toBe('PEV2_INTERNAL');
    expect(error.retryable).toBe(true);
  });
});

describe('transport errors', () => {
  it('are retryable', () => {
    expect(new TimeoutError().retryable).toBe(true);
    expect(new ConnectionError('socket hang up').retryable).toBe(true);
  });
});
