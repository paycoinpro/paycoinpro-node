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

## Webhook Verification

Verify webhooks using the built-in helper:

```typescript
import PayCoinPro, { WebhookVerificationError } from 'paycoinpro';

const client = new PayCoinPro({
  apiKey: 'pk_live_...',
  webhookSecret: 'whsec_...',
});

app.post('/webhooks', (req, res) => {
  try {
    const event = client.webhooks.verify(
      req.body,
      req.headers['x-payload-hash']
    );

    switch (event.event) {
      case 'invoice.paid':
        // Handle paid invoice
        break;
      case 'deposit.received':
        // Handle deposit
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      res.status(400).send('Invalid signature');
    }
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
