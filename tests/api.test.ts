import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { PayCoinProAPIError, TimeoutError } from '../src/lib/errors.js';

function stubFetch(response: { status?: number; body?: unknown }): {
  fetch: typeof fetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: (response.status ?? 200) < 400,
      status: response.status ?? 200,
      json: async () => response.body ?? {},
    };
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const client = (fetchImpl: typeof fetch) =>
  new APIClient({ credential: 'ck_test_abc', fetch: fetchImpl });

describe('URL building', () => {
  it('appends /api/v2 to the configured origin', async () => {
    const { fetch, calls } = stubFetch({ body: { assets: [] } });
    await client(fetch).get('/assets');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
  });

  it('does not double the /api/v2 segment when the origin already carries it', async () => {
    const { fetch, calls } = stubFetch({ body: { assets: [] } });
    const c = new APIClient({
      credential: 'ck_test_abc',
      baseURL: 'https://paycoinpro.com/api/v2',
      fetch,
    });
    await c.get('/assets');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
  });

  it('serializes query params and drops undefined ones', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await client(fetch).get('/invoices', { limit: 50, status: undefined, after: 'cur_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices?limit=50&after=cur_1');
  });
});

describe('headers', () => {
  it('sends the credential as a bearer token', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await client(fetch).get('/assets');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer ck_test_abc'
    );
  });

  it('sends Idempotency-Key on mutations', async () => {
    const { fetch, calls } = stubFetch({ status: 201, body: {} });
    await client(fetch).post('/invoices', { fiatAmount: '5000' }, { idempotencyKey: 'invoice:42' });
    expect((calls[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe('invoice:42');
  });

  it('rejects a mutation with a blank idempotency key before making a request', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await expect(client(fetch).post('/invoices', {}, { idempotencyKey: '   ' })).rejects.toThrow(
      /idempotencyKey/
    );
    expect(calls).toHaveLength(0);
  });
});

describe('error mapping', () => {
  it('maps a non-2xx response to PayCoinProAPIError', async () => {
    const { fetch } = stubFetch({
      status: 409,
      body: {
        code: 'PEV2_ORDER_ID_CONFLICT',
        message: 'order already used',
        requestId: 'req_zzz11111',
      },
    });
    await expect(client(fetch).get('/invoices')).rejects.toMatchObject({
      name: 'PayCoinProAPIError',
      code: 'PEV2_ORDER_ID_CONFLICT',
      requestId: 'req_zzz11111',
      retryable: false,
    });
  });

  it('maps an abort to TimeoutError', async () => {
    const abort = (async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;
    await expect(client(abort).get('/assets')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('never retries automatically', async () => {
    const { fetch, calls } = stubFetch({
      status: 500,
      body: { code: 'PEV2_INTERNAL', message: 'boom', requestId: 'req_aaa11111' },
    });
    await expect(client(fetch).get('/assets')).rejects.toBeInstanceOf(PayCoinProAPIError);
    expect(calls).toHaveLength(1);
  });
});

describe('construction', () => {
  it('rejects a missing credential', () => {
    expect(() => new APIClient({ credential: '' })).toThrow(/credential/i);
  });
});
