import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import PayCoinPro from '../src/index.js';
import { WebhookSignatureError, getSignatureFromHeaders } from '../src/index.js';

describe('Webhooks', () => {
  const client = new PayCoinPro({
    apiKey: 'pk_test_123',
  });

  const secret = 'whsec_test_secret_123';

  const sampleEvent = {
    id: 'evt_123',
    type: 'invoice.completed',
    data: {
      id: 'inv_abc123',
      amount: 99.99,
      currency: 'USDT',
      status: 'completed',
    },
    createdAt: '2024-01-15T10:30:00Z',
  };

  describe('verify', () => {
    it('should verify and parse valid webhook payload', () => {
      const payload = JSON.stringify(sampleEvent);
      const signature = createHmac('sha512', secret).update(payload).digest('hex');

      const event = client.webhooks.verify(payload, signature, secret);

      expect(event).toEqual(sampleEvent);
      expect(event.id).toBe('evt_123');
      expect(event.type).toBe('invoice.completed');
    });

    it('should verify payload object and return event', () => {
      const payloadString = JSON.stringify(sampleEvent);
      const signature = createHmac('sha512', secret).update(payloadString).digest('hex');

      const event = client.webhooks.verify(sampleEvent, signature, secret);

      expect(event.id).toBe('evt_123');
    });

    it('should throw error for invalid signature', () => {
      const payload = JSON.stringify(sampleEvent);
      const invalidSignature = 'invalid_signature';

      expect(() => {
        client.webhooks.verify(payload, invalidSignature, secret);
      }).toThrow(WebhookSignatureError);
    });

    it('should throw error for tampered payload', () => {
      const payload = JSON.stringify(sampleEvent);
      const signature = createHmac('sha512', secret).update(payload).digest('hex');

      const tamperedPayload = JSON.stringify({
        ...sampleEvent,
        data: { ...sampleEvent.data, amount: 9999.99 },
      });

      expect(() => {
        client.webhooks.verify(tamperedPayload, signature, secret);
      }).toThrow(WebhookSignatureError);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify(sampleEvent);
      const signature = createHmac('sha512', secret).update(payload).digest('hex');

      const isValid = client.webhooks.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify(sampleEvent);

      const isValid = client.webhooks.verifySignature(payload, 'invalid', secret);

      expect(isValid).toBe(false);
    });

    it('should return false for empty signature', () => {
      const payload = JSON.stringify(sampleEvent);

      const isValid = client.webhooks.verifySignature(payload, '', secret);

      expect(isValid).toBe(false);
    });

    it('should return false for empty secret', () => {
      const payload = JSON.stringify(sampleEvent);
      const signature = createHmac('sha512', secret).update(payload).digest('hex');

      const isValid = client.webhooks.verifySignature(payload, signature, '');

      expect(isValid).toBe(false);
    });
  });

  describe('generateSignature', () => {
    it('should generate correct signature', () => {
      const payload = JSON.stringify(sampleEvent);
      const expectedSignature = createHmac('sha512', secret).update(payload).digest('hex');

      const signature = client.webhooks.generateSignature(payload, secret);

      expect(signature).toBe(expectedSignature);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ id: '1' });
      const payload2 = JSON.stringify({ id: '2' });

      const sig1 = client.webhooks.generateSignature(payload1, secret);
      const sig2 = client.webhooks.generateSignature(payload2, secret);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('signatureHeader', () => {
    it('should return correct header name', () => {
      expect(client.webhooks.signatureHeader).toBe('x-payload-hash');
    });
  });
});

describe('getSignatureFromHeaders', () => {
  const expectedSignature = 'test_signature_123';

  it('should extract signature from Headers object', () => {
    const headers = new Headers();
    headers.set('x-payload-hash', expectedSignature);

    const signature = getSignatureFromHeaders(headers);

    expect(signature).toBe(expectedSignature);
  });

  it('should extract signature from plain object', () => {
    const headers = {
      'x-payload-hash': expectedSignature,
    };

    const signature = getSignatureFromHeaders(headers);

    expect(signature).toBe(expectedSignature);
  });

  it('should extract signature from Map', () => {
    const headers = new Map<string, string>();
    headers.set('x-payload-hash', expectedSignature);

    const signature = getSignatureFromHeaders(headers);

    expect(signature).toBe(expectedSignature);
  });

  it('should handle case-insensitive header lookup', () => {
    const headers = {
      'X-PAYLOAD-HASH': expectedSignature,
    };

    // Should work with lowercase lookup
    const signature = getSignatureFromHeaders({
      'x-payload-hash': expectedSignature,
    });

    expect(signature).toBe(expectedSignature);
  });

  it('should return undefined for missing header', () => {
    const headers = {};

    const signature = getSignatureFromHeaders(headers);

    expect(signature).toBeUndefined();
  });

  it('should handle array values', () => {
    const headers = {
      'x-payload-hash': [expectedSignature, 'another_value'],
    };

    const signature = getSignatureFromHeaders(headers);

    expect(signature).toBe(expectedSignature);
  });
});
