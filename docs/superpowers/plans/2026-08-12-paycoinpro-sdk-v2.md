# paycoinpro@2.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead v1 SDK with a working client for PayCoinPro Payment Engine V2, so `npm install paycoinpro` produces a package whose calls do not return `410 Gone`.

**Architecture:** Types regenerate from the live OpenAPI document into `src/types/openapi.ts`; thin hand-written resource classes wrap a shared `APIClient`. Two separate client classes — `PayCoinPro` holds only `ck_*` merchant keys, `PayCoinProPayouts` holds only `pc_*` payout credentials — so the payout credential can never reach an ordinary request path. All v1 resources are deleted, not deprecated.

**Tech Stack:** TypeScript (ES2022, strict), tsup (cjs+esm+dts), vitest, openapi-typescript, zero runtime dependencies.

**Spec:** `cryptic-wallet-letancy/docs/superpowers/specs/2026-08-12-paycoinpro-sdk-v2-design.md`

## Global Constraints

- Zero runtime dependencies. `package.json` `dependencies` stays `{}`.
- No `number` in any monetary position, anywhere. Amounts are exact integer strings carried alongside their `decimals` or `exponent`.
- Every mutation takes `idempotencyKey` as a **required** option. The SDK never generates one.
- Payout creation additionally requires a per-call `totp` argument. It is never a constructor option and is never cached.
- Merchant auth header: `Authorization: Bearer ck_test_…` / `ck_live_…`.
- Payout auth header: `Authorization: Bearer pc_test_…` / `pc_live_…`, plus `X-Payout-2FA: <six digits>`.
- Webhook signature: `HMAC-SHA256(timestamp + "." + rawBody)`, hex, delivered as `X-PayCoinPro-Signature: v1=<hex>` with up to two comma-separated values during rotation overlap. Companion headers `X-PayCoinPro-Timestamp` and `X-PayCoinPro-Event-Id`.
- `ApiError.code` is one of exactly twelve values: `PEV2_VALIDATION_ERROR`, `PEV2_UNAUTHORIZED`, `PEV2_FORBIDDEN`, `PEV2_NOT_FOUND`, `PEV2_IDEMPOTENCY_CONFLICT`, `PEV2_ORDER_ID_CONFLICT`, `PEV2_QUOTE_EXPIRED`, `PEV2_INVALID_TRANSITION`, `PEV2_CROSS_ENGINE_WRITE`, `PEV2_KILL_SWITCH_ACTIVE`, `PEV2_RATE_LIMITED`, `PEV2_INTERNAL`.
- The SDK never retries automatically. It exposes `error.retryable` and leaves the decision to the caller.
- Run `npm run typecheck && npm run lint && npm run test` before every commit.

---

## File Structure

**Created:**
- `src/lib/money.ts` — display formatting for exact-string amounts
- `src/lib/idempotency.ts` — stable key helper
- `src/resources/checkouts.ts` — public checkout endpoints (no merchant key)
- `src/resources/webhook-endpoints.ts` — endpoint CRUD, secret rotation, redelivery
- `src/resources/balances.ts` — balance reads
- `src/resources/ledger.ts` — ledger transaction reads
- `src/resources/payouts.ts` — payout resource, used only by the payout client
- `src/payout-client.ts` — `PayCoinProPayouts`

**Modified:**
- `src/types/openapi.ts` — regenerated
- `src/types/index.ts` — v2 aliases replace v1 aliases
- `src/lib/errors.ts` — PEV2 codes, `retryable`
- `src/lib/api.ts` — v2 base URL, idempotency plumbing, v2 error envelope
- `src/resources/assets.ts` — v2 catalogue shape
- `src/resources/invoices.ts` — create / select / cancel / reads
- `src/resources/webhooks.ts` — new three-header verification
- `src/client.ts` — v2 resource wiring
- `src/index.ts` — exports
- `README.md`, `example.ts`, `package.json`

**Deleted:**
- `src/resources/deposit-addresses.ts`
- `src/resources/deposits.ts`

---

### Task 1: Baseline and regenerated v2 types

**Files:**
- Modify: `src/types/openapi.ts` (regenerated)
- Modify: `src/types/index.ts`
- Test: `tests/types.test-d.ts`

**Interfaces:**
- Consumes: nothing
- Produces: type aliases `AssetCatalogResponse`, `InvoiceResource`, `CreateInvoiceRequest`, `SelectPaymentMethodRequest`, `InvoiceStatus`, `DashboardInvoiceList`, `InvoicePaymentsResponse`, `InvoiceEventBatch`, `BalancesResponse`, `LedgerTransactionsResponse`, `CreatePayoutRequest`, `ApprovePayoutRequest`, `CancelPayoutRequest`, `PayoutResource`, `PayoutStatus`, `PayoutList`, `PublicCheckoutResource`, `PublicCheckoutStatus`, `PublicCheckoutSelectRequest`, `CreateWebhookEndpointRequest`, `UpdateWebhookEndpointRequest`, `RotateWebhookSecretRequest`, `WebhookEndpointResource`, `WebhookEndpointList`, `WebhookRedeliveryAccepted`, `ApiError`; plus `PayCoinProOptions`, `PayoutClientOptions`, `RequestOptions`, `MutationOptions`, `PayoutMutationOptions`

- [ ] **Step 1: Resolve the dirty working tree**

The repository has uncommitted modifications on `main` from earlier work: `README.md`, `example.ts`, `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/workflows/sync-openapi.yml`, `.gitignore`, `.prettierignore`, `.prettierrc`, `eslint.config.mjs`, `LICENSE`.

```bash
cd /Volumes/T7Shield/Dev/paycoinpro-node
git status --short
git diff
```

Read the diff. If the changes are wanted, commit them on `main` before branching. If not, `git restore` them. Do not start the v2 work on top of an ambiguous tree.

- [ ] **Step 2: Branch**

```bash
git checkout -b feat/v2
```

- [ ] **Step 3: Confirm the canonical API origin**

Two origins appear in existing material: `https://paycoinpro.com` (used by the `generate` script) and `https://app.paycoinpro.com` (used by the integration manifest's `PAYCOINPRO_BASE_URL`). Determine which serves the API.

```bash
curl -s -o /dev/null -w "paycoinpro.com     %{http_code}\n" https://paycoinpro.com/api/v2/assets
curl -s -o /dev/null -w "app.paycoinpro.com %{http_code}\n" https://app.paycoinpro.com/api/v2/assets
```

Both should return `401` (auth required, endpoint exists) rather than `404`. Whichever returns `401`, use as `DEFAULT_BASE_URL` in Task 3. If both do, prefer `https://paycoinpro.com` for consistency with the `generate` script. Record the choice in the commit message.

- [ ] **Step 4: Regenerate types**

```bash
npm run generate
git diff --stat src/types/openapi.ts
```

The script already points at `https://paycoinpro.com/api/openapi`, which now serves the V2 document, so no script change is needed. Expect a large diff: v1 schemas disappear and v2 schemas appear.

- [ ] **Step 5: Verify the regenerated document is v2**

```bash
grep -c "/api/v2/" src/types/openapi.ts   # expect > 0
grep -c "/api/v1/" src/types/openapi.ts   # expect 0
```

- [ ] **Step 6: Write the failing type test**

Create `tests/types.test-d.ts`:

```ts
import { expectTypeOf, test } from 'vitest';
import type {
  InvoiceResource,
  CreateInvoiceRequest,
  ApiError,
  BalancesResponse,
} from '../src/types/index.js';

test('invoice fiat amount is an exact string, never a number', () => {
  expectTypeOf<InvoiceResource['fiat']['amount']>().toEqualTypeOf<string>();
  expectTypeOf<CreateInvoiceRequest['fiatAmount']>().toEqualTypeOf<string>();
});

test('invoice carries the v2 status enum', () => {
  expectTypeOf<InvoiceResource['status']>().toMatchTypeOf<
    | 'REQUIRES_PAYMENT_METHOD'
    | 'AWAITING_PAYMENT'
    | 'CONFIRMING'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERPAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'MANUAL_REVIEW'
  >();
});

test('the error envelope carries a request id', () => {
  expectTypeOf<ApiError['requestId']>().toEqualTypeOf<string>();
});

test('balances respond with a defined shape', () => {
  expectTypeOf<BalancesResponse>().not.toBeAny();
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run tests/types.test-d.ts`
Expected: FAIL — `src/types/index.ts` still exports v1 aliases, so `InvoiceResource` and the others do not exist.

- [ ] **Step 8: Replace the type aliases**

Rewrite `src/types/index.ts`:

```ts
/**
 * PayCoinPro SDK Types
 *
 * API types are auto-generated from the Payment Engine V2 OpenAPI document.
 * Run `npm run generate` to update.
 */

export type { paths, components, operations } from './openapi.js';

import type { components } from './openapi.js';

type Schemas = components['schemas'];

// Catalogue
export type AssetCatalogResponse = Schemas['AssetCatalogResponse'];
export type CatalogAsset = AssetCatalogResponse['assets'][number];

// Invoices
export type InvoiceResource = Schemas['InvoiceResource'];
export type CreateInvoiceRequest = Schemas['CreateInvoiceRequest'];
export type SelectPaymentMethodRequest = Schemas['SelectPaymentMethodRequest'];
export type InvoiceStatus = Schemas['InvoiceStatus'];
export type DashboardInvoiceList = Schemas['DashboardInvoiceList'];
export type InvoicePaymentsResponse = Schemas['InvoicePaymentsResponse'];
export type InvoiceEventBatch = Schemas['InvoiceEventBatch'];

// Ledger
export type BalancesResponse = Schemas['BalancesResponse'];
export type LedgerTransactionsResponse = Schemas['LedgerTransactionsResponse'];

// Payouts
export type CreatePayoutRequest = Schemas['CreatePayoutRequest'];
export type ApprovePayoutRequest = Schemas['ApprovePayoutRequest'];
export type CancelPayoutRequest = Schemas['CancelPayoutRequest'];
export type PayoutResource = Schemas['PayoutResource'];
export type PayoutStatus = Schemas['PayoutStatus'];
export type PayoutList = Schemas['PayoutList'];

// Public checkout
export type PublicCheckoutResource = Schemas['PublicCheckoutResource'];
export type PublicCheckoutStatus = Schemas['PublicCheckoutStatus'];
export type PublicCheckoutSelectRequest = Schemas['PublicCheckoutSelectRequest'];

// Webhook endpoints
export type CreateWebhookEndpointRequest = Schemas['CreateWebhookEndpointRequest'];
export type UpdateWebhookEndpointRequest = Schemas['UpdateWebhookEndpointRequest'];
export type RotateWebhookSecretRequest = Schemas['RotateWebhookSecretRequest'];
export type WebhookEndpointResource = Schemas['WebhookEndpointResource'];
export type WebhookEndpointList = Schemas['WebhookEndpointList'];
export type WebhookRedeliveryAccepted = Schemas['WebhookRedeliveryAccepted'];

// Errors
export type ApiError = Schemas['ApiError'];
export type ApiErrorCode = ApiError['code'];

// SDK configuration (not from the API)
export interface PayCoinProOptions {
  /** Merchant API key: `ck_test_…` or `ck_live_…`. */
  apiKey: string;
  /** API origin. The SDK appends `/api/v2`. */
  baseURL?: string;
  timeout?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface PayoutClientOptions {
  /** Payout credential: `pc_test_…` or `pc_live_…`. */
  credential: string;
  baseURL?: string;
  timeout?: number;
  debug?: boolean;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface MutationOptions extends RequestOptions {
  /**
   * Required. Must be stable across retries of the same logical operation and
   * persisted alongside the record it belongs to.
   */
  idempotencyKey: string;
}

export interface PayoutMutationOptions extends MutationOptions {
  /** Fresh six-digit owner TOTP. Never cached, never persisted. */
  totp: string;
}
```

- [ ] **Step 9: Run the type test to verify it passes**

Run: `npx vitest run tests/types.test-d.ts`
Expected: PASS

If a schema name does not resolve, read the actual generated names and correct the alias — the generated document is authoritative:

```bash
grep -o '"[A-Za-z]*Response"\|"[A-Za-z]*Resource"\|"[A-Za-z]*Request"' src/types/openapi.ts | sort -u
```

- [ ] **Step 10: Commit**

The rest of `src/` still references deleted v1 aliases and will not typecheck until Task 10. That is expected; do not chase it here.

```bash
git add src/types/ tests/types.test-d.ts
git commit -m "feat!: regenerate types from Payment Engine V2 OpenAPI

BREAKING CHANGE: v1 type aliases are removed. The v2 resource model
replaces deposit addresses with invoices."
```

---

### Task 2: Error model

**Files:**
- Modify: `src/lib/errors.ts`
- Test: `tests/errors.test.ts`

**Interfaces:**
- Consumes: `ApiErrorCode` from Task 1
- Produces: `PayCoinProError`, `PayCoinProAPIError` with `{ status, code, message, requestId, details, retryable }`, `PayCoinProError.fromResponse(status, body)`, `TimeoutError`, `ConnectionError`, `WebhookVerificationError`

- [ ] **Step 1: Write the failing test**

Replace `tests/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PayCoinProAPIError,
  PayCoinProError,
  TimeoutError,
  ConnectionError,
} from '../src/lib/errors.js';

const envelope = (code: string) => ({
  code,
  message: 'boom',
  requestId: 'req_abc12345',
  details: [{ path: 'fiatAmount', code: 'invalid', message: 'bad' }],
});

describe('PayCoinProAPIError.fromResponse', () => {
  it('carries code, message, requestId and details', () => {
    const error = PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR'));
    expect(error).toBeInstanceOf(PayCoinProError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('PEV2_VALIDATION_ERROR');
    expect(error.requestId).toBe('req_abc12345');
    expect(error.details).toHaveLength(1);
  });

  it('includes the request id in the message so it can be quoted in support', () => {
    const error = PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR'));
    expect(error.message).toContain('req_abc12345');
  });

  it('marks rate limiting and internal errors retryable', () => {
    expect(PayCoinProAPIError.fromResponse(429, envelope('PEV2_RATE_LIMITED')).retryable).toBe(true);
    expect(PayCoinProAPIError.fromResponse(500, envelope('PEV2_INTERNAL')).retryable).toBe(true);
  });

  it('marks validation and conflict errors not retryable', () => {
    expect(PayCoinProAPIError.fromResponse(400, envelope('PEV2_VALIDATION_ERROR')).retryable).toBe(false);
    expect(PayCoinProAPIError.fromResponse(409, envelope('PEV2_IDEMPOTENCY_CONFLICT')).retryable).toBe(false);
    expect(PayCoinProAPIError.fromResponse(409, envelope('PEV2_ORDER_ID_CONFLICT')).retryable).toBe(false);
    expect(PayCoinProAPIError.fromResponse(409, envelope('PEV2_INVALID_TRANSITION')).retryable).toBe(false);
    expect(PayCoinProAPIError.fromResponse(422, envelope('PEV2_QUOTE_EXPIRED')).retryable).toBe(false);
  });

  it('treats the kill switch as retryable — the pause is temporary', () => {
    expect(PayCoinProAPIError.fromResponse(503, envelope('PEV2_KILL_SWITCH_ACTIVE')).retryable).toBe(true);
  });

  it('survives a non-conforming body without throwing', () => {
    const error = PayCoinProAPIError.fromResponse(502, undefined);
    expect(error.status).toBe(502);
    expect(error.code).toBe('PEV2_INTERNAL');
    expect(error.retryable).toBe(true);
  });
});

describe('transport errors', () => {
  it('are retryable', () => {
    expect(new TimeoutError().retryable).toBe(true);
    expect(new ConnectionError('socket hang up').retryable).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/errors.test.ts`
Expected: FAIL — `PayCoinProAPIError` is not exported; the file still defines the v1 `APIError` hierarchy.

- [ ] **Step 3: Rewrite the error module**

Replace `src/lib/errors.ts`:

```ts
/**
 * PayCoinPro SDK errors.
 *
 * Every non-2xx response becomes a PayCoinProAPIError carrying the V2 error
 * envelope verbatim. Retry classification is exposed, never acted on — a
 * mutation is only safe to retry with the caller's stable idempotency key.
 */

import type { ApiErrorCode } from '../types/index.js';

export interface ApiErrorDetail {
  path: string;
  code: string;
  message: string;
}

export class PayCoinProError extends Error {
  /** Whether retrying the identical request could succeed. */
  readonly retryable: boolean = false;

  constructor(message: string) {
    super(message);
    this.name = 'PayCoinProError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Codes where retrying the identical request can succeed. */
const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'PEV2_RATE_LIMITED',
  'PEV2_KILL_SWITCH_ACTIVE',
  'PEV2_INTERNAL',
]);

export class PayCoinProAPIError extends PayCoinProError {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly requestId: string;
  readonly details: readonly ApiErrorDetail[];
  override readonly retryable: boolean;

  constructor(input: {
    status: number;
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: readonly ApiErrorDetail[];
  }) {
    super(`${input.message} (${input.code}, request ${input.requestId})`);
    this.name = 'PayCoinProAPIError';
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details ?? [];
    this.retryable = RETRYABLE_CODES.has(input.code) || input.status >= 500;
  }

  /**
   * Build from a response body. Tolerates a non-conforming body: a proxy or
   * gateway can return HTML, and that must not crash the caller.
   */
  static fromResponse(status: number, body: unknown): PayCoinProAPIError {
    const envelope = (body ?? {}) as Partial<{
      code: ApiErrorCode;
      message: string;
      requestId: string;
      details: ApiErrorDetail[];
    }>;

    return new PayCoinProAPIError({
      status,
      code: envelope.code ?? 'PEV2_INTERNAL',
      message: envelope.message ?? `Request failed with status ${status}`,
      requestId: envelope.requestId ?? 'req_unknown',
      details: envelope.details,
    });
  }
}

export class TimeoutError extends PayCoinProError {
  override readonly retryable = true;

  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ConnectionError extends PayCoinProError {
  override readonly retryable = true;

  constructor(message = 'Connection failed') {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class WebhookVerificationError extends PayCoinProError {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/errors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts tests/errors.test.ts
git commit -m "feat!: replace error hierarchy with the V2 ApiError envelope

BREAKING CHANGE: APIError, BadRequestError, AuthenticationError,
NotFoundError and RateLimitError are replaced by PayCoinProAPIError
carrying code, requestId, details and retryable."
```

---

### Task 3: HTTP client

**Files:**
- Modify: `src/lib/api.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- Consumes: `PayCoinProOptions`, `PayoutClientOptions`, `RequestOptions`, `MutationOptions` (Task 1); `PayCoinProAPIError`, `TimeoutError`, `ConnectionError` (Task 2)
- Produces: `class APIClient` with `get<T>(path, params?, options?)`, `post<T>(path, body, options)`, `patch<T>(path, body, options)`; constructor `new APIClient({ credential, baseURL?, timeout?, debug?, fetch?, defaultHeaders? })`

- [ ] **Step 1: Write the failing test**

Replace `tests/api.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { PayCoinProAPIError, TimeoutError } from '../src/lib/errors.js';

function stubFetch(response: {
  status?: number;
  body?: unknown;
}): { fetch: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: (response.status ?? 200) < 400,
      status: response.status ?? 200,
      json: async () => response.body ?? {},
    };
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const client = (fetchImpl: typeof fetch) =>
  new APIClient({ credential: 'ck_test_abc', fetch: fetchImpl });

describe('URL building', () => {
  it('appends /api/v2 to the configured origin', async () => {
    const { fetch, calls } = stubFetch({ body: { assets: [] } });
    await client(fetch).get('/assets');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
  });

  it('does not double the /api/v2 segment when the origin already carries it', async () => {
    const { fetch, calls } = stubFetch({ body: { assets: [] } });
    const c = new APIClient({
      credential: 'ck_test_abc',
      baseURL: 'https://paycoinpro.com/api/v2',
      fetch,
    });
    await c.get('/assets');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
  });

  it('serializes query params and drops undefined ones', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await client(fetch).get('/invoices', { limit: 50, status: undefined, after: 'cur_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices?limit=50&after=cur_1');
  });
});

describe('headers', () => {
  it('sends the credential as a bearer token', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await client(fetch).get('/assets');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer ck_test_abc'
    );
  });

  it('sends Idempotency-Key on mutations', async () => {
    const { fetch, calls } = stubFetch({ status: 201, body: {} });
    await client(fetch).post('/invoices', { fiatAmount: '5000' }, { idempotencyKey: 'invoice:42' });
    expect((calls[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe('invoice:42');
  });

  it('rejects a mutation with a blank idempotency key before making a request', async () => {
    const { fetch, calls } = stubFetch({ body: {} });
    await expect(
      client(fetch).post('/invoices', {}, { idempotencyKey: '   ' })
    ).rejects.toThrow(/idempotencyKey/);
    expect(calls).toHaveLength(0);
  });
});

describe('error mapping', () => {
  it('maps a non-2xx response to PayCoinProAPIError', async () => {
    const { fetch } = stubFetch({
      status: 409,
      body: {
        code: 'PEV2_ORDER_ID_CONFLICT',
        message: 'order already used',
        requestId: 'req_zzz11111',
      },
    });
    await expect(client(fetch).get('/invoices')).rejects.toMatchObject({
      name: 'PayCoinProAPIError',
      code: 'PEV2_ORDER_ID_CONFLICT',
      requestId: 'req_zzz11111',
      retryable: false,
    });
  });

  it('maps an abort to TimeoutError', async () => {
    const abort = (async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;
    await expect(client(abort).get('/assets')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('never retries automatically', async () => {
    const { fetch, calls } = stubFetch({
      status: 500,
      body: { code: 'PEV2_INTERNAL', message: 'boom', requestId: 'req_aaa11111' },
    });
    await expect(client(fetch).get('/assets')).rejects.toBeInstanceOf(PayCoinProAPIError);
    expect(calls).toHaveLength(1);
  });
});

describe('construction', () => {
  it('rejects a missing credential', () => {
    expect(() => new APIClient({ credential: '' })).toThrow(/credential/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL — the client still defaults to `/api/v1`, takes `apiKey` rather than `credential`, retries on 5xx, and parses the v1 error shape.

- [ ] **Step 3: Rewrite the HTTP client**

Replace `src/lib/api.ts`. Set `DEFAULT_BASE_URL` to the origin confirmed in Task 1 Step 3.

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts tests/api.test.ts
git commit -m "feat!: target /api/v2, require Idempotency-Key, stop auto-retrying

BREAKING CHANGE: the client no longer retries automatically and mutations
require an explicit idempotencyKey."
```

---

### Task 4: Money and idempotency helpers

**Files:**
- Create: `src/lib/money.ts`
- Create: `src/lib/idempotency.ts`
- Test: `tests/money.test.ts`, `tests/idempotency.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `formatAmount(amount: string, decimals: number): string`, `idempotencyKeyFor(scope: string, id: string): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatAmount } from '../src/lib/money.js';

describe('formatAmount', () => {
  it('inserts the decimal point without floating point', () => {
    expect(formatAmount('123456', 2)).toBe('1234.56');
    expect(formatAmount('1000000', 6)).toBe('1.000000');
  });

  it('left-pads when the integer part is empty', () => {
    expect(formatAmount('5', 6)).toBe('0.000005');
  });

  it('returns the value unchanged at zero decimals', () => {
    expect(formatAmount('4200', 0)).toBe('4200');
  });

  it('handles zero', () => {
    expect(formatAmount('0', 8)).toBe('0.00000000');
  });

  it('preserves precision far beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatAmount('123456789012345678901234567890', 18)).toBe(
      '123456789012.345678901234567890'
    );
  });

  it('rejects a non-integer-string amount rather than guessing', () => {
    expect(() => formatAmount('1.5', 2)).toThrow(/integer string/i);
    expect(() => formatAmount('', 2)).toThrow(/integer string/i);
  });
});
```

Create `tests/idempotency.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { idempotencyKeyFor } from '../src/lib/idempotency.js';

describe('idempotencyKeyFor', () => {
  it('joins scope and id', () => {
    expect(idempotencyKeyFor('invoice', 'dep_42')).toBe('invoice:dep_42');
  });

  it('is stable for the same inputs', () => {
    expect(idempotencyKeyFor('invoice', 'dep_42')).toBe(idempotencyKeyFor('invoice', 'dep_42'));
  });

  it('rejects characters the API will not accept', () => {
    expect(() => idempotencyKeyFor('invoice', 'dep 42')).toThrow(/pattern/i);
    expect(() => idempotencyKeyFor('invoice', 'dep/42')).toThrow(/pattern/i);
  });

  it('rejects a result longer than the 200-character API limit', () => {
    expect(() => idempotencyKeyFor('invoice', 'x'.repeat(200))).toThrow(/200/);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/money.test.ts tests/idempotency.test.ts`
Expected: FAIL — neither module exists.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/money.ts`:

```ts
/**
 * Display formatting for exact-string amounts.
 *
 * The return value is for humans only. Never feed it back into the API —
 * the API takes the original integer string.
 */
export function formatAmount(amount: string, decimals: number): string {
  if (!/^(0|[1-9][0-9]*)$/.test(amount)) {
    throw new Error(`Amount must be an exact integer string, received: ${JSON.stringify(amount)}`);
  }
  if (decimals === 0) return amount;

  const padded = amount.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals);

  return `${whole}.${fraction}`;
}
```

Create `src/lib/idempotency.ts`:

```ts
/**
 * Build a stable idempotency key.
 *
 * The key must be derived from something durable — an order id, a withdrawal
 * id — and persisted with that record. A key regenerated on retry defeats the
 * header entirely and creates a duplicate.
 */
const API_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;

export function idempotencyKeyFor(scope: string, id: string): string {
  const key = `${scope}:${id}`;

  if (key.length > 200) {
    throw new Error(`Idempotency key exceeds the API limit of 200 characters: ${key.length}`);
  }
  if (!API_PATTERN.test(key)) {
    throw new Error(
      `Idempotency key must match the API pattern [A-Za-z0-9_.:-], received: ${JSON.stringify(key)}`
    );
  }

  return key;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/money.test.ts tests/idempotency.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/idempotency.ts tests/money.test.ts tests/idempotency.test.ts
git commit -m "feat: add exact-string money formatting and idempotency key helper"
```

---

### Task 5: Assets and invoices

**Files:**
- Modify: `src/resources/assets.ts`
- Modify: `src/resources/invoices.ts`
- Test: `tests/invoices.test.ts`

**Interfaces:**
- Consumes: `APIClient` (Task 3), types (Task 1)
- Produces: `class Assets { list(options?) }`; `class Invoices { create(params, options), retrieve(id, options?), list(params?, options?), selectPaymentMethod(id, params, options), cancel(id, options), listPayments(id, options?), listEvents(id, params?, options?) }`

- [ ] **Step 1: Write the failing test**

Create `tests/invoices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { Invoices } from '../src/resources/invoices.js';
import { Assets } from '../src/resources/assets.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, client: new APIClient({ credential: 'ck_test_x', fetch: fetchImpl }) };
}

describe('Assets', () => {
  it('lists the catalogue', async () => {
    const { calls, client } = recorder({ assets: [] });
    await new Assets(client).list();
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/assets');
    expect(calls[0].init.method).toBe('GET');
  });
});

describe('Invoices', () => {
  it('creates with the idempotency key on the header, not in the body', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).create(
      { fiatAmount: '5000', currency: 'USD', orderId: 'dep_42' },
      { idempotencyKey: 'invoice:dep_42' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices');
    expect((calls[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'invoice:dep_42'
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      fiatAmount: '5000',
      currency: 'USD',
      orderId: 'dep_42',
    });
  });

  it('will not create without an idempotency key', async () => {
    const { client } = recorder();
    // @ts-expect-error idempotencyKey is required
    await expect(new Invoices(client).create({ fiatAmount: '1', currency: 'USD' }, {})).rejects.toThrow(
      /idempotencyKey/
    );
  });

  it('selects a payment method on the invoice', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).selectPaymentMethod(
      'inv_1',
      { asset: 'USDT', network: 'tron' },
      { idempotencyKey: 'select:inv_1' }
    );
    expect(calls[0].url).toBe(
      'https://paycoinpro.com/api/v2/invoices/inv_1/select-payment-method'
    );
    expect(calls[0].init.method).toBe('POST');
  });

  it('cancels', async () => {
    const { calls, client } = recorder({ id: 'inv_1' });
    await new Invoices(client).cancel('inv_1', { idempotencyKey: 'cancel:inv_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/cancel');
  });

  it('url-encodes an id so a crafted id cannot escape the path', async () => {
    const { calls, client } = recorder({ id: 'x' });
    await new Invoices(client).retrieve('inv/../../admin');
    expect(calls[0].url).toBe(
      'https://paycoinpro.com/api/v2/invoices/inv%2F..%2F..%2Fadmin'
    );
  });

  it('passes list filters as query params', async () => {
    const { calls, client } = recorder({ invoices: [] });
    await new Invoices(client).list({ limit: 25, status: 'PAID' });
    expect(calls[0].url).toBe(
      'https://paycoinpro.com/api/v2/invoices?limit=25&status=PAID'
    );
  });

  it('reads payments and events', async () => {
    const { calls, client } = recorder({ payments: [] });
    const invoices = new Invoices(client);
    await invoices.listPayments('inv_1');
    await invoices.listEvents('inv_1', { after: '12' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/payments');
    expect(calls[1].url).toBe('https://paycoinpro.com/api/v2/invoices/inv_1/events?after=12');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/invoices.test.ts`
Expected: FAIL — `Invoices` has no `selectPaymentMethod`, and `create` takes one argument.

- [ ] **Step 3: Rewrite both resources**

Replace `src/resources/assets.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type { AssetCatalogResponse, RequestOptions } from '../types/index.js';

export class Assets {
  constructor(private readonly client: APIClient) {}

  /** List V2-supported assets and their network capabilities. */
  list(options?: RequestOptions): Promise<AssetCatalogResponse> {
    return this.client.get<AssetCatalogResponse>('/assets', undefined, options);
  }
}
```

Replace `src/resources/invoices.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type {
  CreateInvoiceRequest,
  DashboardInvoiceList,
  InvoiceEventBatch,
  InvoicePaymentsResponse,
  InvoiceResource,
  InvoiceStatus,
  MutationOptions,
  RequestOptions,
  SelectPaymentMethodRequest,
} from '../types/index.js';

export interface InvoiceListParams {
  after?: string;
  limit?: number;
  status?: InvoiceStatus;
}

export interface InvoiceEventParams {
  after?: string;
  limit?: number;
}

export class Invoices {
  constructor(private readonly client: APIClient) {}

  /**
   * Create an invoice. The returned invoice is REQUIRES_PAYMENT_METHOD until
   * selectPaymentMethod quotes an asset, a network, an address and an expiry.
   */
  create(params: CreateInvoiceRequest, options: MutationOptions): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>('/invoices', params, options);
  }

  retrieve(id: string, options?: RequestOptions): Promise<InvoiceResource> {
    return this.client.get<InvoiceResource>(`/invoices/${encodeURIComponent(id)}`, undefined, options);
  }

  list(params?: InvoiceListParams, options?: RequestOptions): Promise<DashboardInvoiceList> {
    return this.client.get<DashboardInvoiceList>(
      '/invoices',
      params as Record<string, unknown> | undefined,
      options
    );
  }

  /** Select asset and network, finalizing the invoice and quoting cryptoDue. */
  selectPaymentMethod(
    id: string,
    params: SelectPaymentMethodRequest,
    options: MutationOptions
  ): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>(
      `/invoices/${encodeURIComponent(id)}/select-payment-method`,
      params,
      options
    );
  }

  cancel(id: string, options: MutationOptions): Promise<InvoiceResource> {
    return this.client.post<InvoiceResource>(
      `/invoices/${encodeURIComponent(id)}/cancel`,
      undefined,
      options
    );
  }

  listPayments(id: string, options?: RequestOptions): Promise<InvoicePaymentsResponse> {
    return this.client.get<InvoicePaymentsResponse>(
      `/invoices/${encodeURIComponent(id)}/payments`,
      undefined,
      options
    );
  }

  /** Read durable invoice events from a reconnect cursor. */
  listEvents(
    id: string,
    params?: InvoiceEventParams,
    options?: RequestOptions
  ): Promise<InvoiceEventBatch> {
    return this.client.get<InvoiceEventBatch>(
      `/invoices/${encodeURIComponent(id)}/events`,
      params as Record<string, unknown> | undefined,
      options
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/invoices.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/assets.ts src/resources/invoices.ts tests/invoices.test.ts
git commit -m "feat!: rewrite assets and invoices for the V2 invoice lifecycle

BREAKING CHANGE: invoices.create takes a required MutationOptions second
argument, and selectPaymentMethod replaces implicit address allocation."
```

---

### Task 6: Webhook endpoints and public checkouts

**Files:**
- Create: `src/resources/webhook-endpoints.ts`
- Create: `src/resources/checkouts.ts`
- Test: `tests/webhook-endpoints.test.ts`

**Interfaces:**
- Consumes: `APIClient` (Task 3), types (Task 1)
- Produces: `class WebhookEndpoints { create, list, update, rotateSecret, redeliverEvent }`; `class Checkouts { retrieve, status, selectPaymentMethod }`

- [ ] **Step 1: Write the failing test**

Create `tests/webhook-endpoints.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { APIClient } from '../src/lib/api.js';
import { WebhookEndpoints } from '../src/resources/webhook-endpoints.js';
import { Checkouts } from '../src/resources/checkouts.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, client: new APIClient({ credential: 'ck_test_x', fetch: fetchImpl }) };
}

describe('WebhookEndpoints', () => {
  it('creates an endpoint with an event list', async () => {
    const { calls, client } = recorder({ id: 'whe_1', secret: 's3cr3t' });
    const created = await new WebhookEndpoints(client).create(
      { url: 'https://merchant.example/webhooks', events: ['invoice.paid.v1'] },
      { idempotencyKey: 'whe:1' }
    );
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-endpoints');
    expect(created.secret).toBe('s3cr3t');
  });

  it('updates via PATCH', async () => {
    const { calls, client } = recorder({ id: 'whe_1' });
    await new WebhookEndpoints(client).update('whe_1', { active: false }, { idempotencyKey: 'whe:off:1' });
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-endpoints/whe_1');
  });

  it('rotates a secret', async () => {
    const { calls, client } = recorder({ id: 'whe_1', secret: 'new' });
    await new WebhookEndpoints(client).rotateSecret('whe_1', {}, { idempotencyKey: 'rot:1' });
    expect(calls[0].url).toBe(
      'https://paycoinpro.com/api/v2/webhook-endpoints/whe_1/rotate-secret'
    );
  });

  it('queues a redelivery', async () => {
    const { calls, client } = recorder({ accepted: true });
    await new WebhookEndpoints(client).redeliverEvent('evt_1', { idempotencyKey: 'redel:evt_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/webhook-events/evt_1/redeliver');
  });
});

describe('Checkouts', () => {
  it('reads a public checkout by its capability id', async () => {
    const { calls, client } = recorder({ publicId: 'pinv_1' });
    await new Checkouts(client).retrieve('pinv_1');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/public/checkouts/pinv_1');
  });

  it('polls customer-safe status', async () => {
    const { calls, client } = recorder({ status: 'AWAITING_PAYMENT' });
    await new Checkouts(client).status('pinv_1');
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/public/checkouts/pinv_1/status');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/webhook-endpoints.test.ts`
Expected: FAIL — neither module exists.

- [ ] **Step 3: Implement both resources**

Create `src/resources/webhook-endpoints.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type {
  CreateWebhookEndpointRequest,
  MutationOptions,
  RequestOptions,
  RotateWebhookSecretRequest,
  UpdateWebhookEndpointRequest,
  WebhookEndpointList,
  WebhookEndpointResource,
  WebhookRedeliveryAccepted,
} from '../types/index.js';

export class WebhookEndpoints {
  constructor(private readonly client: APIClient) {}

  /**
   * Create an endpoint. The response carries `secret` exactly once — persist it
   * immediately; it is not readable again.
   */
  create(
    params: CreateWebhookEndpointRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.post<WebhookEndpointResource>('/webhook-endpoints', params, options);
  }

  list(options?: RequestOptions): Promise<WebhookEndpointList> {
    return this.client.get<WebhookEndpointList>('/webhook-endpoints', undefined, options);
  }

  update(
    id: string,
    params: UpdateWebhookEndpointRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.patch<WebhookEndpointResource>(
      `/webhook-endpoints/${encodeURIComponent(id)}`,
      params,
      options
    );
  }

  /**
   * Rotate the signing secret. Both the old and the new secret sign deliveries
   * during the overlap window, so verification must accept either.
   */
  rotateSecret(
    id: string,
    params: RotateWebhookSecretRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.post<WebhookEndpointResource>(
      `/webhook-endpoints/${encodeURIComponent(id)}/rotate-secret`,
      params,
      options
    );
  }

  redeliverEvent(
    eventId: string,
    options: MutationOptions
  ): Promise<WebhookRedeliveryAccepted> {
    return this.client.post<WebhookRedeliveryAccepted>(
      `/webhook-events/${encodeURIComponent(eventId)}/redeliver`,
      undefined,
      options
    );
  }
}
```

Create `src/resources/checkouts.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type {
  MutationOptions,
  PublicCheckoutResource,
  PublicCheckoutSelectRequest,
  PublicCheckoutStatus,
  RequestOptions,
} from '../types/index.js';

/**
 * Hosted checkout endpoints, authorized by the opaque `pinv_*` capability in
 * the URL rather than by the merchant key. Safe to call from a customer-facing
 * server route.
 */
export class Checkouts {
  constructor(private readonly client: APIClient) {}

  retrieve(publicId: string, options?: RequestOptions): Promise<PublicCheckoutResource> {
    return this.client.get<PublicCheckoutResource>(
      `/public/checkouts/${encodeURIComponent(publicId)}`,
      undefined,
      options
    );
  }

  status(publicId: string, options?: RequestOptions): Promise<PublicCheckoutStatus> {
    return this.client.get<PublicCheckoutStatus>(
      `/public/checkouts/${encodeURIComponent(publicId)}/status`,
      undefined,
      options
    );
  }

  selectPaymentMethod(
    publicId: string,
    params: PublicCheckoutSelectRequest,
    options: MutationOptions
  ): Promise<PublicCheckoutResource> {
    return this.client.post<PublicCheckoutResource>(
      `/public/checkouts/${encodeURIComponent(publicId)}/select-payment-method`,
      params,
      options
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/webhook-endpoints.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/webhook-endpoints.ts src/resources/checkouts.ts tests/webhook-endpoints.test.ts
git commit -m "feat: add webhook endpoint management and public checkout resources"
```

---

### Task 7: Webhook verification

**Files:**
- Modify: `src/resources/webhooks.ts`
- Test: `tests/webhooks.test.ts`

**Interfaces:**
- Consumes: `WebhookVerificationError` (Task 2)
- Produces: `class Webhooks { verify(rawBody, headers, secret, toleranceSeconds?): WebhookEvent; sign(rawBody, secret, timestamp): string }`, `interface WebhookHeaders`, `interface WebhookEvent`

- [ ] **Step 1: Write the failing test**

Create `tests/webhooks.test.ts`:

```ts
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Webhooks } from '../src/resources/webhooks.js';
import { WebhookVerificationError } from '../src/lib/errors.js';

const webhooks = new Webhooks();
const SECRET = 'whsec_test';
const BODY = JSON.stringify({ type: 'invoice.paid.v1', data: { id: 'inv_1' } });

const sign = (secret: string, ts: number, body: string) =>
  createHmac('sha256', secret).update(`${ts}.${body}`, 'utf8').digest('hex');

const headers = (overrides: Partial<Record<string, string>> = {}) => {
  const ts = Math.floor(Date.now() / 1000);
  return {
    'x-paycoinpro-timestamp': String(ts),
    'x-paycoinpro-signature': `v1=${sign(SECRET, ts, BODY)}`,
    'x-paycoinpro-event-id': 'evt_1',
    ...overrides,
  };
};

describe('verify', () => {
  it('accepts a correctly signed delivery and returns the parsed event', () => {
    const event = webhooks.verify(BODY, headers(), SECRET);
    expect(event.type).toBe('invoice.paid.v1');
    expect(event.eventId).toBe('evt_1');
  });

  it('accepts either signature during a rotation overlap', () => {
    const ts = Math.floor(Date.now() / 1000);
    const both = `v1=${sign('old_secret', ts, BODY)},v1=${sign(SECRET, ts, BODY)}`;
    expect(() =>
      webhooks.verify(BODY, headers({ 'x-paycoinpro-timestamp': String(ts), 'x-paycoinpro-signature': both }), SECRET)
    ).not.toThrow();
    expect(() =>
      webhooks.verify(BODY, headers({ 'x-paycoinpro-timestamp': String(ts), 'x-paycoinpro-signature': both }), 'old_secret')
    ).not.toThrow();
  });

  it('reads headers case-insensitively', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      webhooks.verify(
        BODY,
        {
          'X-PayCoinPro-Timestamp': String(ts),
          'X-PayCoinPro-Signature': `v1=${sign(SECRET, ts, BODY)}`,
          'X-PayCoinPro-Event-Id': 'evt_1',
        },
        SECRET
      )
    ).not.toThrow();
  });

  it('rejects a wrong secret', () => {
    expect(() => webhooks.verify(BODY, headers(), 'wrong')).toThrow(WebhookVerificationError);
  });

  it('rejects a tampered body', () => {
    expect(() => webhooks.verify(`${BODY} `, headers(), SECRET)).toThrow(WebhookVerificationError);
  });

  it('rejects a stale timestamp', () => {
    const old = Math.floor(Date.now() / 1000) - 400;
    expect(() =>
      webhooks.verify(
        BODY,
        { 'x-paycoinpro-timestamp': String(old), 'x-paycoinpro-signature': `v1=${sign(SECRET, old, BODY)}`, 'x-paycoinpro-event-id': 'evt_1' },
        SECRET
      )
    ).toThrow(/too old/i);
  });

  it('rejects a timestamp from the future', () => {
    const future = Math.floor(Date.now() / 1000) + 400;
    expect(() =>
      webhooks.verify(
        BODY,
        { 'x-paycoinpro-timestamp': String(future), 'x-paycoinpro-signature': `v1=${sign(SECRET, future, BODY)}`, 'x-paycoinpro-event-id': 'evt_1' },
        SECRET
      )
    ).toThrow(/future/i);
  });

  it('rejects a parsed object instead of a raw string', () => {
    expect(() =>
      // @ts-expect-error rawBody must be a string
      webhooks.verify(JSON.parse(BODY), headers(), SECRET)
    ).toThrow(/raw body must be a string/i);
  });

  it('rejects a missing signature header', () => {
    expect(() =>
      webhooks.verify(BODY, { 'x-paycoinpro-timestamp': '1', 'x-paycoinpro-event-id': 'e' }, SECRET)
    ).toThrow(/signature/i);
  });

  it('rejects an unknown signature version', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      webhooks.verify(
        BODY,
        { 'x-paycoinpro-timestamp': String(ts), 'x-paycoinpro-signature': `v2=${sign(SECRET, ts, BODY)}`, 'x-paycoinpro-event-id': 'e' },
        SECRET
      )
    ).toThrow(WebhookVerificationError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/webhooks.test.ts`
Expected: FAIL — `verify` still takes a single `t=…,v1=…` header string and parses the v1 format.

- [ ] **Step 3: Rewrite verification**

Replace `src/resources/webhooks.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { WebhookVerificationError } from '../lib/errors.js';

const SIGNATURE_VERSION = 'v1';
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface WebhookHeaders {
  [name: string]: string | string[] | undefined;
}

export interface WebhookEvent {
  /** Event type, e.g. `invoice.paid.v1`. */
  type: string;
  /** From X-PayCoinPro-Event-Id. Deduplicate on this — deliveries repeat. */
  eventId: string;
  [key: string]: unknown;
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function constantTimeEquals(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export class Webhooks {
  /**
   * Verify a delivery and return the parsed event.
   *
   * @param rawBody Exact request body as a string, before any JSON parsing.
   * @param headers The request headers; matched case-insensitively.
   * @param secret The endpoint secret returned once at creation or rotation.
   * @param toleranceSeconds Maximum accepted clock skew. Default 300.
   *
   * @example Fastify
   * ```ts
   * fastify.post('/webhooks', async (request, reply) => {
   *   const event = client.webhooks.verify(request.rawBody, request.headers, SECRET);
   *   if (await alreadyProcessed(event.eventId)) return reply.send('OK');
   *   await handle(event);
   *   return reply.send('OK');
   * });
   * ```
   */
  verify(
    rawBody: string,
    headers: WebhookHeaders,
    secret: string,
    toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS
  ): WebhookEvent {
    if (typeof rawBody !== 'string') {
      throw new WebhookVerificationError(
        'Raw body must be a string. Do not pass a parsed JSON object — the signature ' +
          'covers the exact bytes received.'
      );
    }
    if (!secret) {
      throw new WebhookVerificationError('Missing webhook secret');
    }

    const signatureHeader = header(headers, 'X-PayCoinPro-Signature');
    const timestampHeader = header(headers, 'X-PayCoinPro-Timestamp');
    const eventId = header(headers, 'X-PayCoinPro-Event-Id');

    if (!signatureHeader) {
      throw new WebhookVerificationError('Missing X-PayCoinPro-Signature header');
    }
    if (!timestampHeader) {
      throw new WebhookVerificationError('Missing X-PayCoinPro-Timestamp header');
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      throw new WebhookVerificationError(`Invalid timestamp header: ${timestampHeader}`);
    }

    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > toleranceSeconds) {
      throw new WebhookVerificationError(
        `Webhook timestamp too old. Age ${age}s exceeds tolerance ${toleranceSeconds}s.`
      );
    }
    if (age < -toleranceSeconds) {
      throw new WebhookVerificationError(
        'Webhook timestamp is in the future. Check the server clock.'
      );
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    // The header carries up to two signatures during a secret rotation
    // overlap. Accept if either matches.
    const candidates = signatureHeader
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${SIGNATURE_VERSION}=`))
      .map((part) => part.slice(SIGNATURE_VERSION.length + 1));

    if (candidates.length === 0) {
      throw new WebhookVerificationError(
        `No ${SIGNATURE_VERSION} signature found in X-PayCoinPro-Signature`
      );
    }
    if (!candidates.some((candidate) => constantTimeEquals(candidate, expected))) {
      throw new WebhookVerificationError('Invalid webhook signature');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new WebhookVerificationError('Invalid JSON in webhook body');
    }

    return { ...parsed, eventId: eventId ?? '' } as WebhookEvent;
  }

  /** Produce a signature header. For tests and local fixtures only. */
  sign(rawBody: string, secret: string, timestamp: number): string {
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    return `${SIGNATURE_VERSION}=${signature}`;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/webhooks.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/webhooks.ts tests/webhooks.test.ts
git commit -m "feat!: verify webhooks with the V2 three-header scheme

BREAKING CHANGE: verify() takes a headers object rather than a single
signature string, and accepts rotation-overlap signatures."
```

---

### Task 8: Balances and ledger

**Files:**
- Create: `src/resources/balances.ts`
- Create: `src/resources/ledger.ts`
- Test: `tests/ledger.test.ts`

**Interfaces:**
- Consumes: `APIClient` (Task 3), types (Task 1)
- Produces: `class Balances { retrieve(options?) }`, `class Ledger { listTransactions(params?, options?) }`

- [ ] **Step 1: Write the failing test**

Create `tests/ledger.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/ledger.test.ts`
Expected: FAIL — neither module exists.

- [ ] **Step 3: Implement both resources**

Create `src/resources/balances.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type { BalancesResponse, RequestOptions } from '../types/index.js';

export class Balances {
  constructor(private readonly client: APIClient) {}

  /**
   * Read exact available and reserved ledger balances. This is the merchant's
   * V2 ledger, not an on-chain wallet balance; never substitute one for the other.
   */
  retrieve(options?: RequestOptions): Promise<BalancesResponse> {
    return this.client.get<BalancesResponse>('/balances', undefined, options);
  }
}
```

Create `src/resources/ledger.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type { LedgerTransactionsResponse, RequestOptions } from '../types/index.js';

export interface LedgerListParams {
  before?: string;
  limit?: number;
}

export class Ledger {
  constructor(private readonly client: APIClient) {}

  /** List immutable ledger transactions affecting the merchant. */
  listTransactions(
    params?: LedgerListParams,
    options?: RequestOptions
  ): Promise<LedgerTransactionsResponse> {
    return this.client.get<LedgerTransactionsResponse>(
      '/ledger/transactions',
      params as Record<string, unknown> | undefined,
      options
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/ledger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/balances.ts src/resources/ledger.ts tests/ledger.test.ts
git commit -m "feat: add balances and ledger transaction reads"
```

---

### Task 9: Payout client

**Files:**
- Create: `src/resources/payouts.ts`
- Create: `src/payout-client.ts`
- Test: `tests/payouts.test.ts`

**Interfaces:**
- Consumes: `APIClient` (Task 3), `PayoutClientOptions`, `PayoutMutationOptions`, `MutationOptions` (Task 1)
- Produces: `class Payouts { create(params, options), retrieve(id, options?), list(params?, options?), decide(id, params, options), cancel(id, params, options) }`; `class PayCoinProPayouts { readonly payouts: Payouts }`

- [ ] **Step 1: Write the failing test**

Create `tests/payouts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PayCoinProPayouts } from '../src/payout-client.js';

function recorder(body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 201, json: async () => body };
  }) as unknown as typeof fetch;
  return {
    calls,
    client: new PayCoinProPayouts({ credential: 'pc_test_x', fetch: fetchImpl }),
  };
}

describe('PayCoinProPayouts', () => {
  it('sends the payout credential as the bearer token', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.create(
      { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0xabc' },
      { idempotencyKey: 'payout:wd_91', totp: '123456' }
    );
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer pc_test_x'
    );
  });

  it('sends the TOTP as X-Payout-2FA and never in the body', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.create(
      { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0xabc' },
      { idempotencyKey: 'payout:wd_91', totp: '123456' }
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-Payout-2FA']).toBe('123456');
    expect(headers['Idempotency-Key']).toBe('payout:wd_91');
    expect(calls[0].init.body as string).not.toContain('123456');
  });

  it('rejects a malformed TOTP before making a request', async () => {
    const { calls, client } = recorder();
    await expect(
      client.payouts.create(
        { asset: 'USDT', network: 'bsc', amount: '1', destinationAddress: '0xabc' },
        { idempotencyKey: 'payout:1', totp: '12345' }
      )
    ).rejects.toThrow(/six-digit/i);
    expect(calls).toHaveLength(0);
  });

  it('rejects a missing TOTP', async () => {
    const { client } = recorder();
    await expect(
      client.payouts.create(
        { asset: 'USDT', network: 'bsc', amount: '1', destinationAddress: '0xabc' },
        // @ts-expect-error totp is required
        { idempotencyKey: 'payout:1' }
      )
    ).rejects.toThrow(/six-digit/i);
  });

  it('approves and cancels without a TOTP', async () => {
    const { calls, client } = recorder({ id: 'po_1' });
    await client.payouts.decide('po_1', { decision: 'APPROVE' }, { idempotencyKey: 'dec:po_1' });
    await client.payouts.cancel('po_1', {}, { idempotencyKey: 'can:po_1' });
    expect(calls[0].url).toBe('https://paycoinpro.com/api/v2/payouts/po_1/decision');
    expect(calls[1].url).toBe('https://paycoinpro.com/api/v2/payouts/po_1/cancel');
    expect((calls[0].init.headers as Record<string, string>)['X-Payout-2FA']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/payouts.test.ts`
Expected: FAIL — neither module exists.

- [ ] **Step 3: Implement the resource and client**

Create `src/resources/payouts.ts`:

```ts
import type { APIClient } from '../lib/api.js';
import type {
  ApprovePayoutRequest,
  CancelPayoutRequest,
  CreatePayoutRequest,
  MutationOptions,
  PayoutList,
  PayoutMutationOptions,
  PayoutResource,
  PayoutStatus,
  RequestOptions,
} from '../types/index.js';

export interface PayoutListParams {
  status?: PayoutStatus;
  limit?: number;
  offset?: number;
}

const TOTP_PATTERN = /^[0-9]{6}$/;

export class Payouts {
  constructor(private readonly client: APIClient) {}

  /**
   * Create a payout.
   *
   * Requires a fresh six-digit owner TOTP, supplied per call. It is sent as a
   * header, never persisted, never logged, and never placed in the body.
   * Creation is not completion — track a terminal payout state.
   */
  // `async` so the TOTP guard rejects rather than throwing synchronously.
  async create(
    params: CreatePayoutRequest,
    options: PayoutMutationOptions
  ): Promise<PayoutResource> {
    if (!TOTP_PATTERN.test(options?.totp ?? '')) {
      throw new Error('Payout creation requires a fresh six-digit owner TOTP');
    }
    return this.client.post<PayoutResource>('/payouts', params, options);
  }

  retrieve(id: string, options?: RequestOptions): Promise<PayoutResource> {
    return this.client.get<PayoutResource>(`/payouts/${encodeURIComponent(id)}`, undefined, options);
  }

  list(params?: PayoutListParams, options?: RequestOptions): Promise<PayoutList> {
    return this.client.get<PayoutList>(
      '/payouts',
      params as Record<string, unknown> | undefined,
      options
    );
  }

  decide(
    id: string,
    params: ApprovePayoutRequest,
    options: MutationOptions
  ): Promise<PayoutResource> {
    return this.client.post<PayoutResource>(
      `/payouts/${encodeURIComponent(id)}/decision`,
      params,
      options
    );
  }

  cancel(
    id: string,
    params: CancelPayoutRequest,
    options: MutationOptions
  ): Promise<PayoutResource> {
    return this.client.post<PayoutResource>(
      `/payouts/${encodeURIComponent(id)}/cancel`,
      params,
      options
    );
  }
}
```

Create `src/payout-client.ts`:

```ts
import { APIClient } from './lib/api.js';
import { Payouts } from './resources/payouts.js';
import type { PayoutClientOptions } from './types/index.js';

/**
 * Payout client.
 *
 * Deliberately separate from PayCoinPro. It holds only the `pc_*` payout
 * credential, so an application that never pays out never constructs an object
 * carrying it, and the credential cannot reach an ordinary invoice request path
 * or a log line written for one.
 */
export class PayCoinProPayouts {
  readonly payouts: Payouts;

  constructor(options: PayoutClientOptions) {
    if (!options.credential) {
      throw new Error('A pc_* payout credential is required');
    }

    const client = new APIClient({
      credential: options.credential,
      baseURL: options.baseURL,
      timeout: options.timeout,
      debug: options.debug,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
    });

    this.payouts = new Payouts(client);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/payouts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/payouts.ts src/payout-client.ts tests/payouts.test.ts
git commit -m "feat: add PayCoinProPayouts with per-call TOTP

The payout credential lives in its own client so it cannot reach an
ordinary request path."
```

---

### Task 10: Client assembly and public surface

**Files:**
- Modify: `src/client.ts`
- Modify: `src/index.ts`
- Delete: `src/resources/deposit-addresses.ts`, `src/resources/deposits.ts`
- Test: `tests/client.test.ts`

**Interfaces:**
- Consumes: every resource from Tasks 5–9
- Produces: `class PayCoinPro { assets, invoices, checkouts, webhookEndpoints, webhooks, balances, ledger }`; the complete package export surface

- [ ] **Step 1: Write the failing test**

Replace `tests/client.test.ts`:

```ts
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
    expect((client as Record<string, unknown>).depositAddresses).toBeUndefined();
    expect((client as Record<string, unknown>).deposits).toBeUndefined();
  });

  it('never exposes payouts on the merchant client', () => {
    expect((client as Record<string, unknown>).payouts).toBeUndefined();
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/client.test.ts`
Expected: FAIL — the client still wires `depositAddresses` and `deposits`.

- [ ] **Step 3: Delete the v1 resources**

```bash
git rm src/resources/deposit-addresses.ts src/resources/deposits.ts
```

- [ ] **Step 4: Rewrite the client**

Replace `src/client.ts`:

```ts
import { APIClient } from './lib/api.js';
import { Assets } from './resources/assets.js';
import { Balances } from './resources/balances.js';
import { Checkouts } from './resources/checkouts.js';
import { Invoices } from './resources/invoices.js';
import { Ledger } from './resources/ledger.js';
import { WebhookEndpoints } from './resources/webhook-endpoints.js';
import { Webhooks } from './resources/webhooks.js';
import type { PayCoinProOptions } from './types/index.js';

/**
 * PayCoinPro merchant client for Payment Engine V2.
 *
 * Holds only the `ck_*` merchant key. Payouts live on PayCoinProPayouts,
 * which takes the separately scoped `pc_*` credential.
 */
export class PayCoinPro {
  readonly assets: Assets;
  readonly invoices: Invoices;
  readonly checkouts: Checkouts;
  readonly webhookEndpoints: WebhookEndpoints;
  readonly webhooks: Webhooks;
  readonly balances: Balances;
  readonly ledger: Ledger;

  constructor(options: PayCoinProOptions) {
    if (!options.apiKey) {
      throw new Error('apiKey is required (ck_test_… or ck_live_…)');
    }

    const client = new APIClient({
      credential: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
      debug: options.debug,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
    });

    this.assets = new Assets(client);
    this.invoices = new Invoices(client);
    this.checkouts = new Checkouts(client);
    this.webhookEndpoints = new WebhookEndpoints(client);
    this.webhooks = new Webhooks();
    this.balances = new Balances(client);
    this.ledger = new Ledger(client);
  }
}

export default PayCoinPro;
```

- [ ] **Step 5: Rewrite the package surface**

Replace `src/index.ts`:

```ts
/**
 * PayCoinPro Node.js SDK — Payment Engine V2.
 *
 * API types are auto-generated from the OpenAPI document.
 * Run `npm run generate` to update them.
 */

export { PayCoinPro, PayCoinPro as default } from './client.js';
export { PayCoinProPayouts } from './payout-client.js';

// Helpers
export { idempotencyKeyFor } from './lib/idempotency.js';
export { formatAmount } from './lib/money.js';

// Errors
export {
  PayCoinProError,
  PayCoinProAPIError,
  TimeoutError,
  ConnectionError,
  WebhookVerificationError,
} from './lib/errors.js';
export type { ApiErrorDetail } from './lib/errors.js';

// Webhook helpers
export { Webhooks } from './resources/webhooks.js';
export type { WebhookEvent, WebhookHeaders } from './resources/webhooks.js';

// Resource parameter types
export type { InvoiceListParams, InvoiceEventParams } from './resources/invoices.js';
export type { LedgerListParams } from './resources/ledger.js';
export type { PayoutListParams } from './resources/payouts.js';

// SDK configuration
export type {
  PayCoinProOptions,
  PayoutClientOptions,
  RequestOptions,
  MutationOptions,
  PayoutMutationOptions,
} from './types/index.js';

// API types
export type {
  paths,
  components,
  operations,
  AssetCatalogResponse,
  CatalogAsset,
  InvoiceResource,
  CreateInvoiceRequest,
  SelectPaymentMethodRequest,
  InvoiceStatus,
  DashboardInvoiceList,
  InvoicePaymentsResponse,
  InvoiceEventBatch,
  BalancesResponse,
  LedgerTransactionsResponse,
  CreatePayoutRequest,
  ApprovePayoutRequest,
  CancelPayoutRequest,
  PayoutResource,
  PayoutStatus,
  PayoutList,
  PublicCheckoutResource,
  PublicCheckoutStatus,
  PublicCheckoutSelectRequest,
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  RotateWebhookSecretRequest,
  WebhookEndpointResource,
  WebhookEndpointList,
  WebhookRedeliveryAccepted,
  ApiError,
  ApiErrorCode,
} from './types/index.js';
```

- [ ] **Step 6: Run the whole suite and the typecheck**

```bash
npm run typecheck
npm run lint
npm run test
```

Expected: all pass. This is the first point where the whole package compiles, since Task 1 left `src/` referencing removed aliases.

- [ ] **Step 7: Verify the build produces both module formats**

```bash
npm run build
node -e "const m = require('./dist/index.cjs'); if (!m.PayCoinPro || !m.PayCoinProPayouts) { throw new Error('cjs export missing'); } console.log('cjs ok')"
node --input-type=module -e "import('./dist/index.js').then(m => { if (!m.PayCoinPro || !m.PayCoinProPayouts) throw new Error('esm export missing'); console.log('esm ok') })"
```

- [ ] **Step 8: Commit**

```bash
git add -A src tests
git commit -m "feat!: wire the V2 client surface and drop v1 resources

BREAKING CHANGE: depositAddresses and deposits are removed. They have no
V2 equivalent — create an invoice and select a payment method instead."
```

---

### Task 11: Documentation, example, and release

**Files:**
- Modify: `README.md`
- Modify: `example.ts`
- Modify: `package.json`
- Create: `MIGRATION.md`

**Interfaces:**
- Consumes: the complete surface from Task 10
- Produces: `2.0.0` ready to publish

- [ ] **Step 1: Bump the version**

Edit `package.json`: set `"version": "2.0.0"`. Confirm `dependencies` is still `{}`.

- [ ] **Step 2: Write the migration guide**

Create `MIGRATION.md`:

````markdown
# Migrating from 1.x to 2.0

API V1 is retired and returns `410 Gone`. Every 1.x call fails. 2.0 targets
Payment Engine V2, which is a different resource model — this is a rewrite of
your integration, not a version bump.

## Deposit addresses are gone

1.x allocated a durable address per user, asset and network. Any amount could
arrive at any time.

```ts
// 1.x — no longer exists
const address = await client.depositAddresses.create({
  asset: 'USDT', network: 'tron', externalUserId: user.id,
});
```

2.0 creates an invoice for a fixed fiat amount, then quotes a single-use
address with an exact crypto amount and an expiry.

```ts
const invoice = await client.invoices.create(
  { fiatAmount: '5000', currency: 'USD', orderId: `dep_${deposit.id}` },
  { idempotencyKey: idempotencyKeyFor('invoice', deposit.id) },
);

const quoted = await client.invoices.selectPaymentMethod(
  invoice.id,
  { asset: 'USDT', network: 'tron' },
  { idempotencyKey: idempotencyKeyFor('select', deposit.id) },
);

// quoted.cryptoDue.amountDisplay — show this exact amount
// quoted.expiresAt              — show a countdown
```

Practical consequence: your deposit UI must ask for an amount **before** it can
show an address, and the address expires.

## `externalUserId` becomes `orderId` / `metadata`

Persist your own mapping from `orderId` to the user, and read it back when a
webhook arrives.

## Amounts are exact strings

`fiatAmount: '5000'` with `currency: 'USD'` means 50.00 USD — a minor-unit
integer as a string. Never parse these into `number`.

```ts
import { formatAmount } from 'paycoinpro';
formatAmount(invoice.cryptoDue.amount, invoice.cryptoDue.decimals); // display only
```

## Mutations require an idempotency key

```ts
await client.invoices.create(params, { idempotencyKey: 'invoice:order_42' });
```

The key must be derived from something durable and persisted with that record.
A key regenerated on retry creates a duplicate invoice.

## Webhook verification changed

1.x read one header, `t=…,v1=…`. 2.0 reads three, and accepts two signatures
during a secret rotation overlap.

```ts
const event = client.webhooks.verify(rawBody, request.headers, secret);
if (await alreadyProcessed(event.eventId)) return; // deliveries repeat
```

Event names are versioned: `invoice.paid.v1`, `invoice.expired.v1`,
`invoice.overpaid.v1`, and so on.

## Errors

```ts
try {
  await client.invoices.create(params, { idempotencyKey: key });
} catch (error) {
  if (error instanceof PayCoinProAPIError) {
    error.code;       // 'PEV2_ORDER_ID_CONFLICT'
    error.requestId;  // quote this in support
    error.retryable;  // the SDK never retries for you
  }
}
```

## Payouts moved to their own client

```ts
const payouts = new PayCoinProPayouts({ credential: process.env.PAYCOINPRO_PAYOUT_CREDENTIAL });

await payouts.payouts.create(
  { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0x…' },
  { idempotencyKey: 'payout:wd_91', totp: '123456' },
);
```

The TOTP is supplied per call by the account owner. Never cache or persist it.
````

- [ ] **Step 3: Rewrite the example**

Replace `example.ts`:

```ts
/**
 * PayCoinPro V2 — end-to-end example.
 *
 * Run: PAYCOINPRO_API_KEY=ck_test_… npx tsx example.ts
 */

import { PayCoinPro, formatAmount, idempotencyKeyFor, PayCoinProAPIError } from './src/index.js';

const client = new PayCoinPro({ apiKey: process.env.PAYCOINPRO_API_KEY! });

async function main() {
  const { assets } = await client.assets.list();
  console.log(`${assets.length} asset/network pairs available`);

  const orderId = `demo_${process.pid}`;

  const invoice = await client.invoices.create(
    { fiatAmount: '500', currency: 'USD', orderId },
    { idempotencyKey: idempotencyKeyFor('invoice', orderId) },
  );
  console.log(`invoice ${invoice.id} — ${invoice.status}`);

  const usdt = assets.find((a) => a.asset === 'USDT' && a.receivingSupported);
  if (!usdt) throw new Error('No USDT network is currently enabled');

  const quoted = await client.invoices.selectPaymentMethod(
    invoice.id,
    { asset: usdt.asset, network: usdt.network },
    { idempotencyKey: idempotencyKeyFor('select', orderId) },
  );

  console.log(`send exactly ${quoted.cryptoDue!.amountDisplay} ${usdt.asset} on ${usdt.networkName}`);
  console.log(`status: ${quoted.status}`);

  const { balances } = await client.balances.retrieve();
  for (const balance of balances) {
    console.log(`${balance.asset}: ${formatAmount(balance.available, balance.decimals)}`);
  }
}

main().catch((error) => {
  if (error instanceof PayCoinProAPIError) {
    console.error(`${error.code} (${error.requestId}): ${error.message}`);
    process.exitCode = 1;
    return;
  }
  throw error;
});
```

If a field name in this example does not match the generated types, correct the
example against the types — they are generated from the live document and are
authoritative.

- [ ] **Step 4: Update the README**

Rewrite `README.md` so that:

- the quickstart shows invoice create, select payment method, and webhook verification, in that order
- the hosted-checkout path (`create invoice`, redirect to `pay/{publicId}`, handle one webhook) is presented first, since it is the shortest correct integration
- every code sample passes `idempotencyKey`
- no sample uses `number` for money
- deposit addresses appear nowhere
- a "Migrating from 1.x" section links to `MIGRATION.md`

- [ ] **Step 5: Verify the example against a real test key**

```bash
PAYCOINPRO_API_KEY=ck_test_… npx tsx example.ts
```

Expected: prints the asset count, an invoice id, an exact amount to send, and the balances. If this fails with `PEV2_UNAUTHORIZED`, the key is wrong or V2 is not enabled for that merchant. If it fails with `404`, the base URL from Task 1 Step 3 is wrong.

- [ ] **Step 6: Full verification**

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
git diff --check
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add README.md MIGRATION.md example.ts package.json
git commit -m "docs: rewrite for V2 and add the 1.x migration guide

Release 2.0.0."
```

- [ ] **Step 8: Publish**

Publishing is a separate, deliberate act. Confirm with the account owner first, then:

```bash
npm publish --access public
```

Verify the published package resolves and its calls reach v2:

```bash
cd $(mktemp -d) && npm init -y >/dev/null && npm install paycoinpro@2.0.0
node -e "const {PayCoinPro}=require('paycoinpro'); console.log(Object.keys(new PayCoinPro({apiKey:'ck_test_x'})))"
```

Expected: `assets, invoices, checkouts, webhookEndpoints, webhooks, balances, ledger`.

---

## Notes for the implementer

**The generated types are authoritative.** If a type alias in Task 1 does not
resolve, or a field in a test does not exist, read `src/types/openapi.ts` and
correct the plan's assumption. The plan was written against the OpenAPI document
as served on 2026-08-12; a schema may have been renamed since.

**Tasks 1 through 9 leave the package uncompilable.** Task 1 removes the v1 type
aliases while `src/resources/deposit-addresses.ts` still imports them. Each task
runs its own tests, which pass in isolation because vitest compiles per-file.
`npm run typecheck` only goes green at Task 10 Step 6. Do not try to fix
typecheck errors in unrelated files before then.

**Do not add retry logic.** It was removed deliberately. A retry that
regenerates an idempotency key creates duplicate invoices, and in a casino
deposit flow that means crediting a user twice.
