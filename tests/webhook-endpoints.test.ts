import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { WebhookEndpoints } from '../src/resources/webhook-endpoints.js';
import { Checkouts } from '../src/resources/checkouts.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, client: new APIClient({ credential: 'ck_test_x', fetch: fetchImpl }) };
}

describe('WebhookEndpoints', () => {
  it('creates an endpoint with an event list', async () => {
    const { calls, client } = recorder({ id: 'whe_1', secret: 's3cr3t' });
    const created = await new WebhookEndpoints(client).create(
      { url: 'https://merchant.example/webhooks', events: ['invoice.paid.v1'] },
      { idempotencyKey: 'whe:1' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-endpoints');
    expect(created.secret).toBe('s3cr3t');
  });

  it('updates via PATCH', async () => {
    const { calls, client } = recorder({ id: 'whe_1' });
    await new WebhookEndpoints(client).update(
      'whe_1',
      { active: false },
      { idempotencyKey: 'whe:off:1' }
    );
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-endpoints/whe_1');
  });

  it('rotates a secret', async () => {
    const { calls, client } = recorder({ id: 'whe_1', secret: 'new' });
    await new WebhookEndpoints(client).rotateSecret('whe_1', {}, { idempotencyKey: 'rot:1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-endpoints/whe_1/rotate-secret');
  });

  it('queues a redelivery', async () => {
    const { calls, client } = recorder({ accepted: true });
    await new WebhookEndpoints(client).redeliverEvent('evt_1', { idempotencyKey: 'redel:evt_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-events/evt_1/redeliver');
  });
});

describe('Checkouts', () => {
  it('reads a public checkout by its capability id', async () => {
    const { calls, client } = recorder({ publicId: 'pinv_1' });
    await new Checkouts(client).retrieve('pinv_1');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/public/checkouts/pinv_1');
  });

  it('polls customer-safe status', async () => {
    const { calls, client } = recorder({ status: 'AWAITING_PAYMENT' });
    await new Checkouts(client).status('pinv_1');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/public/checkouts/pinv_1/status');
  });
});
