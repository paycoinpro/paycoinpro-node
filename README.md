# PayCoinPro Node.js SDK

TypeScript SDK for PayCoinPro cryptocurrency payment gateway.

## Installation

```bash
npm install paycoinpro
```

## Quick Start

```typescript
import PayCoinPro from 'paycoinpro';

const client = new PayCoinPro({
  apiKey: 'pk_live_...',
});

// Create an invoice
const invoice = await client.invoices.create({
  amount: 99.99,
  currency: 'USDT',
  network: 'bsc',
  orderId: 'ORD-123',
  webhookUrl: 'https://store.com/webhooks',
});

console.log(`Payment address: ${invoice.paymentAddress}`);
```

## API Reference

### Invoices

```typescript
// Create
const invoice = await client.invoices.create({
  amount: 99.99,
  currency: 'USDT',
  network: 'bsc',
});

// Get
const invoice = await client.invoices.retrieve('inv_abc123');

// List
const invoices = await client.invoices.list({ limit: 10 });
```

### Deposit Addresses

```typescript
// Create
const address = await client.depositAddresses.create({
  asset: 'USDT',
  network: 'bsc',
});

// List
const addresses = await client.depositAddresses.list();
```

### Deposits

```typescript
const deposits = await client.deposits.list();
```

### Assets

```typescript
// List available assets
const { assets } = await client.assets.list();

// Example response:
// [
//   { symbol: 'USDT', name: 'Tether USD', iconUrl: '...', networks: [{ code: 'ethereum', name: 'Ethereum' }, ...] },
//   { symbol: 'BTC', name: 'Bitcoin', iconUrl: '...', networks: [{ code: 'bitcoin', name: 'Bitcoin' }] },
// ]
```

## Webhooks

All payment events (invoices and deposits) are sent to a single webhook URL configured for your merchant account.

### Webhook Events

**Invoice Events:**
- `invoice.created` - New invoice created
- `invoice.awaiting` - Customer selected payment method
- `invoice.paid` - Payment received and confirmed
- `invoice.underpaid` - Payment below expected amount
- `invoice.overpaid` - Payment exceeds expected amount
- `invoice.expired` - Invoice expired without payment

**Deposit Events:**
- `deposit.received` - Deposit confirmed on blockchain

### Webhook Payloads

**Invoice Event Payload:**
```json
{
  "event": "invoice.paid",
  "timestamp": "2024-01-15T12:30:00.000Z",
  "data": {
    "invoiceId": "clx1abc123def456",
    "orderId": "ORD-12345",
    "amount": 99.99,
    "currency": "USD",
    "amountCrypto": "0.0025",
    "asset": "BTC",
    "network": "bitcoin",
    "txHash": "abc123...",
    "paidAt": "2024-01-15T12:30:00.000Z"
  }
}
```

**Deposit Event Payload:**
```json
{
  "event": "deposit.received",
  "timestamp": "2025-12-22T10:31:00.000Z",
  "data": {
    "depositId": "dep_abc123xyz",
    "depositAddressId": "depaddr_cly1234567890",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
    "txHash": "0x1234567890abcdef...",
    "amount": "100.5",
    "netAmount": "99.5",
    "asset": "USDT",
    "network": "BSC",
    "networkName": "BNB Smart Chain",
    "status": "CONFIRMED",
    "confirmedAt": "2025-12-22T10:31:00.000Z"
  }
}
```

### Signature Verification

Verify webhook authenticity using the `X-Payload-Hash` header with HMAC-SHA512:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload, InvoiceWebhookPayload, DepositWebhookPayload } from 'paycoinpro';

const WEBHOOK_SECRET = process.env.PAYCOINPRO_WEBHOOK_SECRET;

app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-payload-hash'] as string;
  const payload = JSON.stringify(req.body);
  const expected = createHmac('sha512', WEBHOOK_SECRET).update(payload).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const isValid = signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event: WebhookPayload = req.body;

  // Handle different event types
  if (event.event.startsWith('invoice.')) {
    const invoiceEvent = event as InvoiceWebhookPayload;
    console.log(`Invoice ${invoiceEvent.data.invoiceId}: ${invoiceEvent.event}`);
  } else if (event.event === 'deposit.received') {
    const depositEvent = event as DepositWebhookPayload;
    console.log(`Deposit ${depositEvent.data.depositId}: ${depositEvent.data.amount} ${depositEvent.data.asset}`);
  }

  res.status(200).send('OK');
});
```

## Error Handling

```typescript
import { AuthenticationError, NotFoundError, RateLimitError } from 'paycoinpro';

try {
  const invoice = await client.invoices.retrieve('inv_123');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.error('Invoice not found');
  }
}
```

## License

MIT
