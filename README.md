# PayCoinPro Node.js SDK

[![npm version](https://badge.fury.io/js/paycoinpro.svg)](https://www.npmjs.com/package/paycoinpro)
[![CI](https://github.com/paycoinpro/paycoinpro-node/actions/workflows/ci.yml/badge.svg)](https://github.com/paycoinpro/paycoinpro-node/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript/JavaScript SDK for the [PayCoinPro](https://paycoinpro.com) cryptocurrency payment gateway.

## Features

- Full TypeScript support with strict types
- Zero dependencies (uses native `fetch`)
- Works in Node.js 18+ and modern browsers
- ESM and CommonJS builds
- Automatic retries with exponential backoff
- Webhook signature verification
- Request/response logging

## Installation

```bash
npm install paycoinpro
```

```bash
yarn add paycoinpro
```

```bash
pnpm add paycoinpro
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
  redirectUrl: 'https://store.com/success',
  webhookUrl: 'https://store.com/webhooks',
});

console.log(`Payment address: ${invoice.paymentAddress}`);
```

## Configuration

```typescript
const client = new PayCoinPro({
  // Required
  apiKey: 'pk_live_...',

  // Optional
  baseURL: 'https://paycoinpro.com/api/v1', // API base URL
  timeout: 30000,                            // Request timeout in ms
  maxRetries: 2,                             // Max retry attempts
  debug: false,                              // Enable debug logging
});
```

## API Reference

### Invoices

Create and manage payment invoices.

```typescript
// Create an invoice
const invoice = await client.invoices.create({
  amount: 99.99,
  currency: 'USDT',
  network: 'bsc',
  orderId: 'ORD-123',
  description: 'Premium subscription',
  redirectUrl: 'https://store.com/success',
  webhookUrl: 'https://store.com/webhooks',
  expiresIn: 60, // minutes
  metadata: {
    userId: 'user_123',
    plan: 'premium',
  },
});

// Retrieve an invoice
const invoice = await client.invoices.retrieve('inv_abc123');

// List invoices
const invoices = await client.invoices.list({
  limit: 20,
  status: 'completed',
  currency: 'USDT',
});
```

### Deposit Addresses

Create and manage deposit addresses for receiving payments.

```typescript
// Create/get a deposit address
const address = await client.depositAddresses.create({
  asset: 'USDT',
  network: 'bsc',
  label: 'Main wallet',
});

console.log(`Deposit to: ${address.address}`);

// List all deposit addresses
const addresses = await client.depositAddresses.list({
  asset: 'USDT',
});
```

### Deposits

View deposit history.

```typescript
// List deposits
const deposits = await client.deposits.list({
  asset: 'USDT',
  status: 'confirmed',
  limit: 50,
});

// Get a specific deposit
const deposit = await client.deposits.retrieve('dep_abc123');
```

### Balances

Check your account balances.

```typescript
// Get all balances
const balances = await client.balances.list();

for (const balance of balances) {
  console.log(`${balance.asset}: ${balance.available} available`);
}

// Get balance for a specific asset
const usdtBalance = await client.balances.retrieve('USDT');
```

### Withdrawals

Withdraw funds to external addresses.

```typescript
// Create a withdrawal
const withdrawal = await client.withdrawals.create({
  asset: 'USDT',
  network: 'bsc',
  amount: 100,
  address: '0x...',
});

// Get withdrawal status
const withdrawal = await client.withdrawals.retrieve('wth_abc123');

// List withdrawals
const withdrawals = await client.withdrawals.list({
  status: 'completed',
  limit: 20,
});
```

### Webhooks

Verify webhook signatures to ensure requests are from PayCoinPro.

```typescript
import express from 'express';
import PayCoinPro from 'paycoinpro';

const app = express();
const client = new PayCoinPro({ apiKey: 'pk_live_...' });

app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-payload-hash'] as string;

  try {
    const event = client.webhooks.verify(
      req.body.toString(),
      signature,
      process.env.WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'invoice.completed':
        console.log('Invoice paid:', event.data.id);
        // Fulfill the order
        break;

      case 'invoice.expired':
        console.log('Invoice expired:', event.data.id);
        // Cancel the order
        break;

      case 'deposit.confirmed':
        console.log('Deposit confirmed:', event.data.txHash);
        break;

      case 'withdrawal.completed':
        console.log('Withdrawal completed:', event.data.id);
        break;
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send('Invalid signature');
  }
});
```

## Error Handling

The SDK throws specific error types for different scenarios:

```typescript
import PayCoinPro, {
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ConnectionError,
} from 'paycoinpro';

try {
  const invoice = await client.invoices.retrieve('inv_123');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.error('Invoice not found');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out');
  } else if (error instanceof ConnectionError) {
    console.error('Network error');
  } else if (error instanceof APIError) {
    console.error(`API error: ${error.message} (${error.code})`);
    console.error(`Request ID: ${error.requestId}`);
  }
}
```

## Request Options

Override settings for individual requests:

```typescript
const invoice = await client.invoices.create(
  {
    amount: 100,
    currency: 'USDT',
    network: 'bsc',
  },
  {
    timeout: 60000,         // Custom timeout
    maxRetries: 5,          // Custom retries
    idempotencyKey: 'key_123', // Prevent duplicates
    headers: {              // Custom headers
      'X-Custom-Header': 'value',
    },
  }
);
```

## Request Cancellation

Cancel requests using AbortController:

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const invoice = await client.invoices.create(
    { amount: 100, currency: 'USDT', network: 'bsc' },
    { signal: controller.signal }
  );
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Request was cancelled');
  }
}
```

## TypeScript

The SDK is written in TypeScript and exports all types:

```typescript
import PayCoinPro, {
  // Types
  Invoice,
  InvoiceCreateParams,
  InvoiceStatus,
  DepositAddress,
  Deposit,
  Balance,
  Withdrawal,
  WebhookEvent,
  WebhookEventType,
  Currency,
  Network,
} from 'paycoinpro';

// Type-safe invoice creation
const params: InvoiceCreateParams = {
  amount: 99.99,
  currency: 'USDT',
  network: 'bsc',
};

const invoice: Invoice = await client.invoices.create(params);
```

## Webhook Event Types

| Event Type | Description |
|------------|-------------|
| `invoice.created` | Invoice was created |
| `invoice.processing` | Payment detected, awaiting confirmations |
| `invoice.completed` | Invoice was paid in full |
| `invoice.expired` | Invoice expired without payment |
| `invoice.underpaid` | Payment received but less than required |
| `invoice.overpaid` | Payment received but more than required |
| `deposit.pending` | Deposit detected on blockchain |
| `deposit.confirmed` | Deposit has required confirmations |
| `deposit.completed` | Deposit credited to balance |
| `withdrawal.pending` | Withdrawal request created |
| `withdrawal.processing` | Withdrawal being processed |
| `withdrawal.completed` | Withdrawal sent to blockchain |
| `withdrawal.failed` | Withdrawal failed |

## Supported Networks

| Network | ID |
|---------|-----|
| Ethereum | `ethereum` |
| BNB Smart Chain | `bsc` |
| Tron | `tron` |
| Polygon | `polygon` |
| Arbitrum | `arbitrum` |
| Optimism | `optimism` |
| Avalanche | `avalanche` |
| Bitcoin | `bitcoin` |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: [https://docs.paycoinpro.com](https://docs.paycoinpro.com)
- API Reference: [https://paycoinpro.com/api/openapi](https://paycoinpro.com/api/openapi)
- Issues: [GitHub Issues](https://github.com/paycoinpro/paycoinpro-node/issues)
