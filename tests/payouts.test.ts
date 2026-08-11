import { describe, expect, it } from 'vitest';
import { PayCoinProPayouts } from '../src/payout-client.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 201, json: async () => body };
  }) as unknown as typeof fetch;
  return {
    calls,
    client: new PayCoinProPayouts({ credential: 'pc_test_x', fetch: fetchImpl }),
  };
}

describe('PayCoinProPayouts', () => {
  it('sends the payout credential as the bearer token', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.create(
      { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0xabc' },
      { idempotencyKey: 'payout:wd_91', totp: '123456' }
    );
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer pc_test_x');
  });

  it('sends the TOTP as X-Payout-2FA and never in the body', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.create(
      { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0xabc' },
      { idempotencyKey: 'payout:wd_91', totp: '123456' }
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-Payout-2FA']).toBe('123456');
    expect(headers['Idempotency-Key']).toBe('payout:wd_91');
    expect(calls[0].init.body as string).not.toContain('123456');
  });

  it('rejects a malformed TOTP before making a request', async () => {
    const { calls, client } = recorder();
    await expect(
      client.payouts.create(
        { asset: 'USDT', network: 'bsc', amount: '1', destinationAddress: '0xabc' },
        { idempotencyKey: 'payout:1', totp: '12345' }
      )
    ).rejects.toThrow(/six-digit/i);
    expect(calls).toHaveLength(0);
  });

  it('rejects a missing TOTP', async () => {
    const { client } = recorder();
    await expect(
      client.payouts.create(
        { asset: 'USDT', network: 'bsc', amount: '1', destinationAddress: '0xabc' },
        // @ts-expect-error totp is required
        { idempotencyKey: 'payout:1' }
      )
    ).rejects.toThrow(/six-digit/i);
  });

  // Approval carries its own second factor as `twoFactorToken` in the BODY,
  // which is a different mechanism from create's X-Payout-2FA header.
  it('approves with twoFactorToken in the body, not the 2FA header', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.decide(
      'po_1',
      { decision: 'APPROVE', twoFactorToken: '123456' },
      { idempotencyKey: 'dec:po_1' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/payouts/po_1/decision');
    expect((calls[0].init.headers as Record<string, string>)['X-Payout-2FA']).toBeUndefined();
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      decision: 'APPROVE',
      twoFactorToken: '123456',
    });
  });

  it('cancels with a required reason', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.cancel(
      'po_1',
      { reason: 'operator cancelled' },
      { idempotencyKey: 'can:po_1' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/payouts/po_1/cancel');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ reason: 'operator cancelled' });
  });

  it('lists and retrieves payouts', async () => {
    const { calls, client } = recorder({ payouts: [] });
    await client.payouts.list({ status: 'COMPLETED', limit: 10 });
    await client.payouts.retrieve('po_1');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/payouts?status=COMPLETED&limit=10');
    expect(calls[1].url).toBe('https://paycoinpro.com/api/v2/payouts/po_1');
  });
});
