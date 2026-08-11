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
  asset: 'USDT',
  network: 'tron',
  externalUserId: user.id,
});
```

2.0 creates an invoice for a fixed fiat amount, then quotes a single-use
address with an exact crypto amount and an expiry.

```ts
import { PayCoinPro, idempotencyKeyFor } from 'paycoinpro';

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

formatAmount(balance.available.amount, balance.available.decimals); // display only
```

Every monetary value arrives as `{ amount, amountDisplay, decimals }`. Use
`amount` for storage and arithmetic, `amountDisplay` for humans.

## Mutations require an idempotency key

```ts
await client.invoices.create(params, { idempotencyKey: 'invoice:order_42' });
```

The key must be derived from something durable and persisted with that record.
A key regenerated on retry creates a duplicate invoice.

The SDK also no longer retries for you. `error.retryable` tells you whether a
retry could succeed; the decision is yours, because it is only safe with a
stable key.

## Webhook verification changed

1.x read one header, `t=…,v1=…`. 2.0 reads three, and accepts two signatures
during a secret rotation overlap.

```ts
const event = client.webhooks.verify(rawBody, request.headers, secret);
if (await alreadyProcessed(event.eventId)) return; // deliveries repeat
```

Headers are `X-PayCoinPro-Signature` (`v1=<hex>`, possibly two values),
`X-PayCoinPro-Timestamp`, and `X-PayCoinPro-Event-Id`. The signature covers
`timestamp + "." + rawBody`, so pass the exact raw body string — never a parsed
object.

Event names are versioned: `invoice.paid.v1`, `invoice.expired.v1`,
`invoice.overpaid.v1`, and so on.

## Errors

```ts
import { PayCoinProAPIError } from 'paycoinpro';

try {
  await client.invoices.create(params, { idempotencyKey: key });
} catch (error) {
  if (error instanceof PayCoinProAPIError) {
    error.code; // 'PEV2_ORDER_ID_CONFLICT'
    error.requestId; // quote this in support
    error.retryable; // the SDK never retries for you
  }
}
```

`APIError`, `BadRequestError`, `AuthenticationError`, `NotFoundError` and
`RateLimitError` are gone, replaced by the single `PayCoinProAPIError`.

## Payouts moved to their own client

```ts
import { PayCoinProPayouts } from 'paycoinpro';

const payouts = new PayCoinProPayouts({
  credential: process.env.PAYCOINPRO_PAYOUT_CREDENTIAL!,
});

await payouts.payouts.create(
  { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0x…' },
  { idempotencyKey: 'payout:wd_91', totp: '123456' },
);
```

The TOTP is supplied per call by the account owner and sent as `X-Payout-2FA`.
Never cache or persist it. Approval uses a separate mechanism —
`twoFactorToken` in the request body:

```ts
await payouts.payouts.decide(
  'po_1',
  { decision: 'APPROVE', twoFactorToken: '123456' },
  { idempotencyKey: 'decide:po_1' },
);
```

Creation and broadcast are not completion. Track a terminal payout state.

## Packaging

2.0 sets `"type": "module"` so the built files match what `package.json`
already declared. On 1.3.3, `require('paycoinpro')` failed with
`MODULE_NOT_FOUND` because `dist/index.cjs` was never emitted. Both `import`
and `require` work in 2.0.
