import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { Invoices } from '../src/resources/invoices.js';
import { Assets } from '../src/resources/assets.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, client: new APIClient({ credential: 'ck_test_x', fetch: fetchImpl }) };
}

describe('Assets', () => {
  it('lists the catalogue', async () => {
    const { calls, client } = recorder({ assets: [] });
    await new Assets(client).list();
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
    expect(calls[0].init.method).toBe('GET');
  });
});

describe('Invoices', () => {
  it('creates with the idempotency key on the header, not in the body', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).create(
      { fiatAmount: '5000', currency: 'USD', orderId: 'dep_42' },
      { idempotencyKey: 'invoice:dep_42' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices');
    expect((calls[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'invoice:dep_42'
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      fiatAmount: '5000',
      currency: 'USD',
      orderId: 'dep_42',
    });
  });

  it('will not create without an idempotency key', async () => {
    const { client } = recorder();
    await expect(
      // @ts-expect-error idempotencyKey is required
      new Invoices(client).create({ fiatAmount: '1', currency: 'USD' }, {})
    ).rejects.toThrow(/idempotencyKey/);
  });

  it('selects a payment method on the invoice', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).selectPaymentMethod(
      'inv_1',
      { asset: 'USDT', network: 'tron' },
      { idempotencyKey: 'select:inv_1' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/select-payment-method');
    expect(calls[0].init.method).toBe('POST');
  });

  it('cancels', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).cancel('inv_1', { idempotencyKey: 'cancel:inv_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/cancel');
  });

  it('url-encodes an id so a crafted id cannot escape the path', async () => {
    const { calls, client } = recorder({ id: 'x' });
    await new Invoices(client).retrieve('inv/../../admin');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv%2F..%2F..%2Fadmin');
  });

  it('passes list filters as query params', async () => {
    const { calls, client } = recorder({ invoices: [] });
    await new Invoices(client).list({ limit: 25, status: 'PAID' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices?limit=25&status=PAID');
  });

  it('reads payments and events', async () => {
    const { calls, client } = recorder({ payments: [] });
    const invoices = new Invoices(client);
    await invoices.listPayments('inv_1');
    await invoices.listEvents('inv_1', { after: '12' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/payments');
    expect(calls[1].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/events?after=12');
  });
});
