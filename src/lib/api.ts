/**
 * PayCoinPro HTTP Client
 */

import type { PayCoinProOptions, RequestOptions } from '../types/index.js';
import { APIError, TimeoutError, ConnectionError } from './errors.js';

const DEFAULT_BASE_URL = 'https://paycoinpro.com/api/v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 0;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class APIClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;
  private readonly _fetch: typeof fetch;

  constructor(options: PayCoinProOptions) {
    if (!options.apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.debug = options.debug ?? false;
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, params, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, undefined, options);
  }

  private async request<T>(
    method: HTTPMethod,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildURL(path, params);
    const maxRetries = options?.maxRetries ?? this.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest<T>(method, url, body, options);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof APIError && error.status < 500 && error.status !== 429) {
          throw error;
        }

        if (attempt >= maxRetries) {
          throw error;
        }

        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private async makeRequest<T>(
    method: HTTPMethod,
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const timeout = options?.timeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options?.headers,
    };

    if (this.debug) {
      console.log(`[PayCoinPro] ${method} ${url}`);
    }

    try {
      const response = await this._fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw APIError.fromResponse(response.status, data?.error);
      }

      // API returns data directly, not wrapped in { data: ... }
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        if (error.message.includes('fetch')) {
          throw new ConnectionError(error.message);
        }
      }

      throw error;
    }
  }

  private buildURL(path: string, params?: Record<string, unknown>): string {
    // Ensure baseURL ends without slash and path starts without slash for proper concatenation
    const base = this.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    const url = new URL(`${base}/${cleanPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            url.searchParams.set(key, value.toISOString());
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      }
    }

    return url.toString();
  }
}
