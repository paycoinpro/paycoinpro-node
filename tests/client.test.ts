import { describe, expect, it } from 'vitest';
import { PayCoinPro } from '../src/client.js';
import { PayCoinProPayouts } from '../src/payout-client.js';

describe('PayCoinPro', () => {
  const client = new PayCoinPro({ apiKey: 'ck_test_x' });

  it('exposes every v2 resource', () => {
    expect(client.assets).toBeDefined();
    expect(client.invoices).toBeDefined();
    expect(client.checkouts).toBeDefined();
    expect(client.webhookEndpoints).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.balances).toBeDefined();
    expect(client.ledger).toBeDefined();
  });

  it('exposes no v1 resources', () => {
    expect((client as unknown as Record<string, unknown>).depositAddresses).toBeUndefined();
    expect((client as unknown as Record<string, unknown>).deposits).toBeUndefined();
  });

  it('never exposes payouts on the merchant client', () => {
    expect((client as unknown as Record<string, unknown>).payouts).toBeUndefined();
  });

  it('rejects a missing api key', () => {
    expect(() => new PayCoinPro({ apiKey: '' })).toThrow(/required/i);
  });
});

describe('package surface', () => {
  it('exports both clients and the helpers', async () => {
    const mod = await import('../src/index.js');
    expect(mod.PayCoinPro).toBe(PayCoinPro);
    expect(mod.PayCoinProPayouts).toBe(PayCoinProPayouts);
    expect(typeof mod.idempotencyKeyFor).toBe('function');
    expect(typeof mod.formatAmount).toBe('function');
    expect(mod.PayCoinProAPIError).toBeDefined();
    expect(mod.WebhookVerificationError).toBeDefined();
  });
});
