# paycoinpro

Official TypeScript SDK for [PayCoinPro](https://paycoinpro.com) — Payment
Engine V2.

Zero runtime dependencies. Types generated from the live OpenAPI document.
Works with `import` and `require`.

```bash
npm install paycoinpro
```

> **Upgrading from 1.x?** API V1 is retired and returns `410 Gone`, so every
> 1.x call fails. Read [MIGRATION.md](./MIGRATION.md) — the resource model
> changed, not just the version.

## Quickstart — hosted checkout

The shortest correct integration. Create an invoice, redirect the customer, and
handle one webhook.

```ts
import { PayCoinPro, idempotencyKeyFor } from 'paycoinpro';

const client = new PayCoinPro({ apiKey: process.env.PAYCOINPRO_API_KEY! });

// 1. Create an invoice for an order. Amounts are exact integer strings —
//    '5000' with currency 'USD' means $50.00.
const invoice = await client.invoices.create(
  {
    fiatAmount: '5000',
    currency: 'USD',
    orderId: order.id,
    successUrl: 'https://shop.example/thanks',
    cancelUrl: 'https://shop.example/cart',
  },
  { idempotencyKey: idempotencyKeyFor('invoice', order.id) },
);

// 2. Send the customer to the hosted checkout.
redirect(`https://paycoinpro.com/pay/${invoice.publicId}`);
```

Then handle the webhook (see below). Never treat a browser redirect as proof of
payment — reconcile server to server.

## Building your own payment UI

Skip the hosted page and quote the address yourself.

```ts
const { assets } = await client.assets.list();

const quoted = await client.invoices.selectPaymentMethod(
  invoice.id,
  { asset: 'USDT', network: 'tron' },
  { idempotencyKey: idempotencyKeyFor('select', order.id) },
);

quoted.cryptoDue?.amountDisplay; // exact amount to send
quoted.expiresAt;                // the quote expires — show a countdown
```

Only offer assets returned by `assets.list()` with `receivingSupported: true`.
Availability changes; do not hard-code a catalogue.

## Webhooks

Register an endpoint once. The secret is returned **exactly once** — persist it
immediately.

```ts
const endpoint = await client.webhookEndpoints.create(
  {
    url: 'https://shop.example/webhooks/paycoinpro',
    events: ['invoice.paid.v1', 'invoice.overpaid.v1', 'invoice.expired.v1'],
  },
  { idempotencyKey: idempotencyKeyFor('webhook', 'primary') },
);

await saveSecret(endpoint.secret);
```

Verify every delivery against the **raw** body, before any JSON parsing:

```ts
// Fastify
fastify.post('/webhooks/paycoinpro', async (request, reply) => {
  const event = client.webhooks.verify(request.rawBody, request.headers, SECRET);

  // Deliveries repeat. Deduplicate on eventId.
  if (await alreadyProcessed(event.eventId)) return reply.send('OK');

  if (event.type === 'invoice.paid.v1') await creditOrder(event);

  return reply.send('OK');
});
```

```ts
// Express
app.post(
  '/webhooks/paycoinpro',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const event = client.webhooks.verify(req.body.toString('utf8'), req.headers, SECRET);
    // …
    res.send('OK');
  },
);
```

`verify` throws `WebhookVerificationError` on a bad signature, a stale
timestamp, or a parsed-object body. It accepts either signature during a secret
rotation overlap, so `rotateSecret` is safe to call while traffic is live.

## Money

Every monetary value is `{ amount, amountDisplay, decimals }`. `amount` is an
exact integer string — store and compare that. Never convert it to `number`.

```ts
import { formatAmount } from 'paycoinpro';

formatAmount('123456', 2); // '1234.56'
formatAmount(balance.available.amount, balance.available.decimals);
```

## Idempotency

Every mutation requires an `idempotencyKey`. The SDK never generates one, on
purpose: a key regenerated on retry creates a duplicate invoice.

```ts
import { idempotencyKeyFor } from 'paycoinpro';

idempotencyKeyFor('invoice', order.id); // 'invoice:order_42'
```

Derive it from something durable and persist it with the record it belongs to.

## Errors

```ts
import { PayCoinProAPIError } from 'paycoinpro';

try {
  await client.invoices.create(params, { idempotencyKey: key });
} catch (error) {
  if (error instanceof PayCoinProAPIError) {
    error.code;      // 'PEV2_VALIDATION_ERROR' | 'PEV2_ORDER_ID_CONFLICT' | …
    error.requestId; // quote this in support
    error.details;   // field-level validation detail
    error.retryable; // true for rate limits, kill switch and 5xx
  }
}
```

The SDK does not retry automatically. Retrying a mutation is only safe with
your stable idempotency key, so that call is yours to make.

## Balances and ledger

```ts
const { balances } = await client.balances.retrieve();
const { transactions } = await client.ledger.listTransactions({ limit: 20 });
```

This is the merchant's V2 ledger, not an on-chain wallet balance. Never
substitute one for the other.

## Payouts

Payouts use a separately scoped `pc_*` credential and live on their own client,
so an application that never pays out never holds that credential.

```ts
import { PayCoinProPayouts } from 'paycoinpro';

const payouts = new PayCoinProPayouts({
  credential: process.env.PAYCOINPRO_PAYOUT_CREDENTIAL!,
});

await payouts.payouts.create(
  { asset: 'USDT', network: 'bsc', amount: '5000000', destinationAddress: '0x…' },
  { idempotencyKey: idempotencyKeyFor('payout', withdrawal.id), totp: '123456' },
);
```

The six-digit TOTP is supplied by the account owner per call. Never cache it,
never log it, never put it in a prompt. Creation and broadcast are not
completion — track a terminal payout state.

## Configuration

```ts
new PayCoinPro({
  apiKey: 'ck_test_…',            // or ck_live_…
  baseURL: 'https://paycoinpro.com', // origin; the SDK appends /api/v2
  timeout: 30_000,
  debug: false,                    // logs method and URL only, never secrets
});
```

Test and live objects never reference each other. A `ck_test_` key sees only
test data.

## API surface

| Resource | Methods |
|---|---|
| `assets` | `list` |
| `invoices` | `create`, `retrieve`, `list`, `selectPaymentMethod`, `cancel`, `listPayments`, `listEvents` |
| `checkouts` | `retrieve`, `status`, `selectPaymentMethod` |
| `webhookEndpoints` | `create`, `list`, `update`, `rotateSecret`, `redeliverEvent` |
| `webhooks` | `verify`, `sign` |
| `balances` | `retrieve` |
| `ledger` | `listTransactions` |
| `PayCoinProPayouts.payouts` | `create`, `retrieve`, `list`, `decide`, `cancel` |

## Development

```bash
npm run generate   # regenerate types from the live OpenAPI document
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

MIT
