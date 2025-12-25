import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { APIError, AuthenticationError, TimeoutError } from '../src/lib/errors.js';

describe('APIClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  const createClient = (options = {}) => {
    return new APIClient({
      apiKey: 'pk_test_123',
      fetch: mockFetch,
      ...options,
    });
  };

  it('should throw error when API key is missing', () => {
    expect(() => new APIClient({ apiKey: '', fetch: mockFetch })).toThrow('API key is required');
  });

  it('should make GET request with correct headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: '123' } }),
    });

    const client = createClient();
    const result = await client.get('/invoices/123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/123'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer pk_test_123',
        }),
      })
    );
    expect(result).toEqual({ id: '123' });
  });

  it('should make POST request with body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'inv_123' } }),
    });

    const client = createClient();
    await client.post('/invoices', { amount: 100 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amount: 100 }),
      })
    );
  });

  it('should throw AuthenticationError for 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'invalid_key', message: 'Invalid API key' } }),
    });

    const client = createClient({ maxRetries: 0 });
    await expect(client.get('/invoices')).rejects.toThrow(AuthenticationError);
  });

  it('should throw TimeoutError on abort', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const client = createClient({ maxRetries: 0 });
    await expect(client.get('/invoices')).rejects.toThrow(TimeoutError);
  });

  it('should retry on 500 error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: '123' } }),
      });

    const client = createClient({ maxRetries: 1 });
    const result = await client.get('/invoices/123');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: '123' });
  });
});
