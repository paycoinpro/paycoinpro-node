import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Webhooks } from '../src/resources/webhooks.js';
import { WebhookVerificationError } from '../src/lib/errors.js';

const webhooks = new Webhooks();
const SECRET = 'whsec_test';
const BODY = JSON.stringify({ type: 'invoice.paid.v1', data: { id: 'inv_1' } });

const sign = (secret: string, ts: number, body: string) =>
  createHmac('sha256', secret).update(`${ts}.${body}`, 'utf8').digest('hex');

const headers = (overrides: Partial<Record<string, string>> = {}) => {
  const ts = Math.floor(Date.now() / 1000);
  return {
    'x-paycoinpro-timestamp': String(ts),
    'x-paycoinpro-signature': `v1=${sign(SECRET, ts, BODY)}`,
    'x-paycoinpro-event-id': 'evt_1',
    ...overrides,
  };
};

describe('verify', () => {
  it('accepts a correctly signed delivery and returns the parsed event', () => {
    const event = webhooks.verify(BODY, headers(), SECRET);
    expect(event.type).toBe('invoice.paid.v1');
    expect(event.eventId).toBe('evt_1');
  });

  it('accepts either signature during a rotation overlap', () => {
    const ts = Math.floor(Date.now() / 1000);
    const both = `v1=${sign('old_secret', ts, BODY)},v1=${sign(SECRET, ts, BODY)}`;
    const h = {
      'x-paycoinpro-timestamp': String(ts),
      'x-paycoinpro-signature': both,
      'x-paycoinpro-event-id': 'evt_1',
    };
    expect(() => webhooks.verify(BODY, h, SECRET)).not.toThrow();
    expect(() => webhooks.verify(BODY, h, 'old_secret')).not.toThrow();
  });

  it('reads headers case-insensitively', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      webhooks.verify(
        BODY,
        {
          'X-PayCoinPro-Timestamp': String(ts),
          'X-PayCoinPro-Signature': `v1=${sign(SECRET, ts, BODY)}`,
          'X-PayCoinPro-Event-Id': 'evt_1',
        },
        SECRET
      )
    ).not.toThrow();
  });

  it('rejects a wrong secret', () => {
    expect(() => webhooks.verify(BODY, headers(), 'wrong')).toThrow(WebhookVerificationError);
  });

  it('rejects a tampered body', () => {
    expect(() => webhooks.verify(`${BODY} `, headers(), SECRET)).toThrow(WebhookVerificationError);
  });

  it('rejects a stale timestamp', () => {
    const old = Math.floor(Date.now() / 1000) - 400;
    expect(() =>
      webhooks.verify(
        BODY,
        {
          'x-paycoinpro-timestamp': String(old),
          'x-paycoinpro-signature': `v1=${sign(SECRET, old, BODY)}`,
          'x-paycoinpro-event-id': 'evt_1',
        },
        SECRET
      )
    ).toThrow(/too old/i);
  });

  it('rejects a timestamp from the future', () => {
    const future = Math.floor(Date.now() / 1000) + 400;
    expect(() =>
      webhooks.verify(
        BODY,
        {
          'x-paycoinpro-timestamp': String(future),
          'x-paycoinpro-signature': `v1=${sign(SECRET, future, BODY)}`,
          'x-paycoinpro-event-id': 'evt_1',
        },
        SECRET
      )
    ).toThrow(/future/i);
  });

  it('rejects a parsed object instead of a raw string', () => {
    expect(() =>
      // @ts-expect-error rawBody must be a string
      webhooks.verify(JSON.parse(BODY), headers(), SECRET)
    ).toThrow(/raw body must be a string/i);
  });

  it('rejects a missing signature header', () => {
    expect(() =>
      webhooks.verify(BODY, { 'x-paycoinpro-timestamp': '1', 'x-paycoinpro-event-id': 'e' }, SECRET)
    ).toThrow(/signature/i);
  });

  it('rejects an unknown signature version', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      webhooks.verify(
        BODY,
        {
          'x-paycoinpro-timestamp': String(ts),
          'x-paycoinpro-signature': `v2=${sign(SECRET, ts, BODY)}`,
          'x-paycoinpro-event-id': 'e',
        },
        SECRET
      )
    ).toThrow(WebhookVerificationError);
  });
});
