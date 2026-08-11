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

  // 500 minor units of USD = $5.00. Always an exact integer string.
  const invoice = await client.invoices.create(
    { fiatAmount: '500', currency: 'USD', orderId },
    { idempotencyKey: idempotencyKeyFor('invoice', orderId) }
  );
  console.log(`invoice ${invoice.id} — ${invoice.status}`);

  const usdt = assets.find((a) => a.asset === 'USDT' && a.receivingSupported);
  if (!usdt) throw new Error('No USDT network is currently enabled');

  const quoted = await client.invoices.selectPaymentMethod(
    invoice.id,
    { asset: usdt.asset, network: usdt.network },
    { idempotencyKey: idempotencyKeyFor('select', orderId) }
  );

  console.log(
    `send exactly ${quoted.cryptoDue?.amountDisplay} ${usdt.asset} on ${usdt.networkName}`
  );
  console.log(`status: ${quoted.status}`);

  const { balances } = await client.balances.retrieve();
  for (const balance of balances) {
    // amountDisplay is already formatted; formatAmount does the same from the
    // raw integer string when you need it.
    const available = formatAmount(balance.available.amount, balance.available.decimals);
    console.log(`${balance.asset} on ${balance.network}: ${available}`);
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
