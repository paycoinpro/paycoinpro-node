/**
 * PayCoinPro HTTP Client
 */

import type { PayCoinProOptions, RequestOptions, APIResponse } from '../types/index.js';
import { APIError, TimeoutError, ConnectionError } from './errors.js';

const DEFAULT_BASE_URL = 'https://paycoinpro.com/api/v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 2;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface APIClientOptions {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  debug: boolean;
  fetch: typeof fetch;
  defaultHeaders: Record<string, string>;
}

export class APIClient {
  private readonly options: APIClientOptions;

  constructor(options: PayCoinProOptions) {
    this.options = {
      apiKey: options.apiKey,
      baseURL: options.baseURL ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      debug: options.debug ?? false,
      fetch: options.fetch ?? globalThis.fetch,
      defaultHeaders: options.defaultHeaders ?? {},
    };

    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }
  }

  /**
   * Make a GET request
   */
  async get<T, P extends object = Record<string, unknown>>(
    path: string,
    params?: P,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildURL(path, params as Record<string, unknown> | undefined);
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>('POST', url, body, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>('PUT', url, body, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>('PATCH', url, body, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * Build the full URL with query parameters
   */
  private buildURL(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path, this.options.baseURL);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            url.searchParams.set(key, value.toISOString());
          } else if (Array.isArray(value)) {
            for (const item of value) {
              url.searchParams.append(key, String(item));
            }
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      }
    }

    return url.toString();
  }

  /**
   * Make an HTTP request with retries and error handling
   */
  private async request<T>(
    method: HTTPMethod,
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.options.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest<T>(method, url, body, options, attempt);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except rate limits
        if (error instanceof APIError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }
        }

        // Don't retry on the last attempt
        if (attempt >= maxRetries) {
          throw error;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt, error instanceof Error ? error : undefined);
        this.log(`Retrying request (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);
        await this.sleep(delay);
      }
    }

    // This should never happen, but TypeScript requires it
    throw lastError ?? new Error('Request failed');
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    method: HTTPMethod,
    url: string,
    body?: unknown,
    options?: RequestOptions,
    attempt: number = 0
  ): Promise<T> {
    const timeout = options?.timeout ?? this.options.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals if provided
    const signal = options?.signal
      ? this.combineSignals(options.signal, controller.signal)
      : controller.signal;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.options.apiKey}`,
      'User-Agent': 'paycoinpro-node/1.0.0',
      ...this.options.defaultHeaders,
      ...options?.headers,
    };

    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    this.log(`${method} ${url}`, { attempt, body });

    try {
      const response = await this.options.fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      clearTimeout(timeoutId);

      this.log(`Response: ${response.status}`, {
        headers: this.headersToObject(response.headers),
      });

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: APIResponse<T> | undefined;

      if (contentType?.includes('application/json')) {
        data = await response.json() as APIResponse<T>;
      }

      // Handle errors
      if (!response.ok) {
        throw APIError.fromResponse(
          response.status,
          response.headers,
          data?.error
        );
      }

      // Return the data
      if (data?.data !== undefined) {
        return data.data;
      }

      return data as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeout}ms`);
        }

        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new ConnectionError(error.message);
        }
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number, error?: Error): number {
    const baseDelay = 1000;
    const maxDelay = 30000;

    // Use Retry-After header if available
    if (error instanceof APIError && 'retryAfter' in error) {
      const retryAfter = (error as { retryAfter?: number }).retryAfter;
      if (retryAfter) {
        return Math.min(retryAfter * 1000, maxDelay);
      }
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }

      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert Headers to a plain object for logging
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      console.log(`[PayCoinPro] ${message}`, data ?? '');
    }
  }
}
