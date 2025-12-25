import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import {
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from '../src/lib/errors.js';

describe('APIClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createClient = (options = {}) => {
    return new APIClient({
      apiKey: 'pk_test_123',
      fetch: mockFetch,
      ...options,
    });
  };

  const createMockResponse = (
    data: unknown,
    status = 200,
    headers: Record<string, string> = {}
  ) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({
        'content-type': 'application/json',
        ...headers,
      }),
      json: () => Promise.resolve({ success: true, data }),
    };
  };

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      expect(() => {
        new APIClient({
          apiKey: '',
          fetch: mockFetch,
        });
      }).toThrow('API key is required');
    });
  });

  describe('get', () => {
    it('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ id: '123' }));

      const client = createClient();
      const result = await client.get('/invoices/123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices/123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer pk_test_123',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ id: '123' });
    });

    it('should include query parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ data: [] }));

      const client = createClient();
      await client.get('/invoices', { limit: 10, status: 'completed' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/limit=10.*status=completed|status=completed.*limit=10/),
        expect.any(Object)
      );
    });

    it('should handle Date parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ data: [] }));

      const client = createClient();
      const date = new Date('2024-01-15T10:30:00Z');
      await client.get('/invoices', { createdAfter: date });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('createdAfter=2024-01-15'),
        expect.any(Object)
      );
    });

    it('should handle array parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ data: [] }));

      const client = createClient();
      await client.get('/balances', { assets: ['USDT', 'BTC'] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('assets=USDT'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('assets=BTC'),
        expect.any(Object)
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ id: 'inv_123' }));

      const client = createClient();
      const result = await client.post('/invoices', {
        amount: 99.99,
        currency: 'USDT',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: 99.99, currency: 'USDT' }),
        })
      );
      expect(result).toEqual({ id: 'inv_123' });
    });

    it('should include idempotency key when provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ id: 'inv_123' }));

      const client = createClient();
      await client.post('/invoices', { amount: 100 }, { idempotencyKey: 'key_123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'key_123',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw AuthenticationError for 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'invalid_api_key', message: 'Invalid API key' },
          }),
      });

      const client = createClient({ maxRetries: 0 });

      await expect(client.get('/invoices')).rejects.toThrow(AuthenticationError);
    });

    it('should throw NotFoundError for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'not_found', message: 'Invoice not found' },
          }),
      });

      const client = createClient({ maxRetries: 0 });

      await expect(client.get('/invoices/123')).rejects.toThrow(NotFoundError);
    });

    it('should throw RateLimitError for 429', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '60',
        }),
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'rate_limit_exceeded', message: 'Too many requests' },
          }),
      });

      const client = createClient({ maxRetries: 0 });

      await expect(client.get('/invoices')).rejects.toThrow(RateLimitError);
    });
  });

  describe('retries', () => {
    it('should retry on 500 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: false }),
        })
        .mockResolvedValueOnce(createMockResponse({ id: '123' }));

      const client = createClient({ maxRetries: 1 });
      const result = await client.get('/invoices/123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: '123' });
    });

    it('should retry on 429 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            'content-type': 'application/json',
            'retry-after': '1',
          }),
          json: () => Promise.resolve({ success: false }),
        })
        .mockResolvedValueOnce(createMockResponse({ id: '123' }));

      const client = createClient({ maxRetries: 1 });
      const result = await client.get('/invoices/123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: '123' });
    });

    it('should not retry on 400 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'bad_request', message: 'Bad request' },
          }),
      });

      const client = createClient({ maxRetries: 3 });

      await expect(client.get('/invoices')).rejects.toThrow(APIError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'unauthorized', message: 'Unauthorized' },
          }),
      });

      const client = createClient({ maxRetries: 3 });

      await expect(client.get('/invoices')).rejects.toThrow(AuthenticationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout', () => {
    it('should accept custom timeout option', () => {
      // Verify the client accepts the timeout option
      const client = createClient({ timeout: 5000, maxRetries: 0 });
      expect(client).toBeDefined();
    });

    it('should throw TimeoutError on abort', async () => {
      // Simulate what happens when AbortController aborts
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      mockFetch.mockRejectedValue(abortError);

      const client = createClient({ maxRetries: 0 });

      await expect(client.get('/invoices/123')).rejects.toThrow(TimeoutError);
    });
  });

  describe('debug mode', () => {
    it('should log requests when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockFetch.mockResolvedValue(createMockResponse({ id: '123' }));

      const client = createClient({ debug: true });
      await client.get('/invoices/123');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PayCoinPro]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });
});
