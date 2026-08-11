/**
 * PayCoinPro HTTP client for Payment Engine V2.
 *
 * Deliberately does not retry. Retrying a mutation is only safe with the
 * caller's stable idempotency key, so that decision belongs to the caller;
 * `error.retryable` tells them whether it is worth attempting.
 */

import type { MutationOptions, RequestOptions } from '../types/index.js';
import { ConnectionError, PayCoinProAPIError, TimeoutError } from './errors.js';

const DEFAULT_BASE_URL = 'https://paycoinpro.com';
const DEFAULT_TIMEOUT = 30_000;
const API_PREFIX = '/api/v2';

export interface APIClientOptions {
  /** `ck_*` merchant key or `pc_*` payout credential. */
  credential: string;
  baseURL?: string;
  timeout?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

type HTTPMethod = 'GET' | 'POST' | 'PATCH';

export class APIClient {
  private readonly credential: string;
  private readonly origin: string;
  private readonly timeout: number;
  private readonly debug: boolean;
  private readonly defaultHeaders: Record<string, string>;
  private readonly _fetch: typeof fetch;

  constructor(options: APIClientOptions) {
    if (!options.credential) {
      throw new Error('A credential is required (ck_* merchant key or pc_* payout credential)');
    }
    this.credential = options.credential;
    this.origin = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.debug = options.debug ?? false;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  get<T>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, params, options);
  }

  // `async` so a failed guard surfaces as a rejected promise rather than a
  // synchronous throw — callers await these, and a sync throw escapes `.catch()`.
  async post<T>(path: string, body: unknown, options: MutationOptions): Promise<T> {
    this.assertIdempotencyKey(options);
    return this.request<T>('POST', path, body, undefined, options);
  }

  async patch<T>(path: string, body: unknown, options: MutationOptions): Promise<T> {
    this.assertIdempotencyKey(options);
    return this.request<T>('PATCH', path, body, undefined, options);
  }

  private assertIdempotencyKey(options: MutationOptions): void {
    if (!options?.idempotencyKey?.trim()) {
      throw new Error(
        'idempotencyKey is required for mutations. It must be stable across retries ' +
          'of the same logical operation and persisted with the record it belongs to. ' +
          'See idempotencyKeyFor().'
      );
    }
  }

  private async request<T>(
    method: HTTPMethod,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    options?: RequestOptions & { idempotencyKey?: string; totp?: string }
  ): Promise<T> {
    const url = this.buildURL(path, params);
    const timeout = options?.timeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.credential}`,
      ...this.defaultHeaders,
      ...options?.headers,
    };
    if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    if (options?.totp) headers['X-Payout-2FA'] = options.totp;

    if (this.debug) {
      // The credential and the TOTP are never logged.
      console.log(`[PayCoinPro] ${method} ${url}`);
    }

    try {
      const response = await this._fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: options?.signal ?? controller.signal,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = undefined;
      }

      if (!response.ok) {
        throw PayCoinProAPIError.fromResponse(response.status, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof PayCoinProAPIError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') throw new TimeoutError();
        throw new ConnectionError(error.message);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildURL(path: string, params?: Record<string, unknown>): string {
    const prefix = this.origin.endsWith(API_PREFIX) ? '' : API_PREFIX;
    const url = new URL(`${this.origin}${prefix}/${path.replace(/^\//, '')}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}
