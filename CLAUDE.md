# PayCoinPro Node.js SDK

This is a TypeScript SDK for the PayCoinPro cryptocurrency payment gateway.

## Project Structure

```
src/
├── index.ts           # Main exports
├── client.ts          # PayCoinPro client class
├── resources/         # API resource classes
│   ├── invoices.ts
│   ├── deposit-addresses.ts
│   ├── deposits.ts
│   └── withdrawals.ts
├── lib/
│   ├── api.ts         # HTTP client with retries
│   └── errors.ts      # Error classes
└── types/
    └── index.ts       # TypeScript types
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invoices` | POST | Create invoice |
| `/invoices` | GET | List invoices |
| `/invoices/:id` | GET | Get invoice |
| `/deposit-addresses` | POST | Create deposit address |
| `/deposit-addresses` | GET | List deposit addresses |
| `/deposits` | GET | List deposits |
| `/withdrawals` | POST | Create withdrawal |
| `/withdrawals` | GET | List withdrawals |

## Build & Test

```bash
npm install     # Install dependencies
npm run build   # Build ESM + CJS
npm test        # Run tests
```

## Key Features

- TypeScript with strict types
- Zero dependencies (native fetch)
- ESM and CommonJS builds
- Automatic retries with exponential backoff
- Bearer token authentication

## Webhook Verification

Webhooks use HMAC-SHA512. The signature is sent in the `x-payload-hash` header.
Users verify on their server:

```typescript
const expected = createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
if (signature === expected) { /* valid */ }
```
