import { describe, it, expect } from 'vitest';
import PayCoinPro from '../src/index.js';

describe('PayCoinPro Client', () => {
  it('should create client with API key', () => {
    const client = new PayCoinPro({ apiKey: 'pk_test_123' });
    expect(client).toBeInstanceOf(PayCoinPro);
    expect(client.invoices).toBeDefined();
    expect(client.depositAddresses).toBeDefined();
    expect(client.deposits).toBeDefined();
    expect(client.withdrawals).toBeDefined();
  });

  it('should throw error when API key is missing', () => {
    expect(() => new PayCoinPro({ apiKey: '' })).toThrow('API key is required');
  });
});
