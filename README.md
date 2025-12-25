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

### Withdrawals

```typescript
// Create
const withdrawal = await client.withdrawals.create({
  asset: 'USDT',
  network: 'bsc',
  amount: 100,
  address: '0x...',
});

// List
const withdrawals = await client.withdrawals.list();
```

## Webhook Verification

Verify webhooks on your server using HMAC-SHA512:

```typescript
import { createHmac } from 'crypto';

app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-payload-hash'];
  const payload = JSON.stringify(req.body);
  const expected = createHmac('sha512', WEBHOOK_SECRET).update(payload).digest('hex');

  if (signature === expected) {
    // Valid webhook
    const { type, data } = req.body;
    // Handle event...
  }
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
