import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { Balances } from '../src/resources/balances.js';
import { Ledger } from '../src/resources/ledger.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string }> = [];
  const fetchImpl = (async (url: string) => {
    calls.push({ url });
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, client: new APIClient({ credential: 'ck_test_x', fetch: fetchImpl }) };
}

describe('Balances', () => {
  it('reads available and reserved balances', async () => {
    const { calls, client } = recorder({ balances: [] });
    await new Balances(client).retrieve();
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/balances');
  });
});

describe('Ledger', () => {
  it('lists transactions with pagination params', async () => {
    const { calls, client } = recorder({ transactions: [] });
    await new Ledger(client).listTransactions({ limit: 20, before: '100' });
    expect(calls[0].url).toBe(
      'https://paycoinpro.com/api/v2/ledger/transactions?limit=20&before=100'
    );
  });
});
