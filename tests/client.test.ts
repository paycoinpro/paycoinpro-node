import { describe, it, expect, vi, beforeEach } from 'vitest';
import PayCoinPro from '../src/index.js';
import { PayCoinProError, AuthenticationError } from '../src/lib/errors.js';

describe('PayCoinPro Client', () => {
  describe('constructor', () => {
    it('should create a client with valid options', () => {
      const client = new PayCoinPro({
        apiKey: 'pk_test_123',
      });

      expect(client).toBeInstanceOf(PayCoinPro);
      expect(client.invoices).toBeDefined();
      expect(client.depositAddresses).toBeDefined();
      expect(client.deposits).toBeDefined();
      expect(client.balances).toBeDefined();
      expect(client.withdrawals).toBeDefined();
      expect(client.webhooks).toBeDefined();
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new PayCoinPro({
          apiKey: '',
        });
      }).toThrow('API key is required');
    });

    it('should accept custom options', () => {
      const client = new PayCoinPro({
        apiKey: 'pk_test_123',
        baseURL: 'https://api.example.com',
        timeout: 60000,
        maxRetries: 5,
        debug: true,
      });

      expect(client).toBeInstanceOf(PayCoinPro);
    });
  });

  describe('resources', () => {
    let client: PayCoinPro;

    beforeEach(() => {
      client = new PayCoinPro({
        apiKey: 'pk_test_123',
      });
    });

    it('should have invoices resource', () => {
      expect(client.invoices).toBeDefined();
      expect(typeof client.invoices.create).toBe('function');
      expect(typeof client.invoices.retrieve).toBe('function');
      expect(typeof client.invoices.list).toBe('function');
    });

    it('should have depositAddresses resource', () => {
      expect(client.depositAddresses).toBeDefined();
      expect(typeof client.depositAddresses.create).toBe('function');
      expect(typeof client.depositAddresses.list).toBe('function');
    });

    it('should have deposits resource', () => {
      expect(client.deposits).toBeDefined();
      expect(typeof client.deposits.list).toBe('function');
      expect(typeof client.deposits.retrieve).toBe('function');
    });

    it('should have balances resource', () => {
      expect(client.balances).toBeDefined();
      expect(typeof client.balances.list).toBe('function');
      expect(typeof client.balances.retrieve).toBe('function');
    });

    it('should have withdrawals resource', () => {
      expect(client.withdrawals).toBeDefined();
      expect(typeof client.withdrawals.create).toBe('function');
      expect(typeof client.withdrawals.retrieve).toBe('function');
      expect(typeof client.withdrawals.list).toBe('function');
    });

    it('should have webhooks utility', () => {
      expect(client.webhooks).toBeDefined();
      expect(typeof client.webhooks.verify).toBe('function');
      expect(typeof client.webhooks.verifySignature).toBe('function');
      expect(typeof client.webhooks.generateSignature).toBe('function');
    });
  });
});
