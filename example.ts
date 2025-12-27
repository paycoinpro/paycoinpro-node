import PayCoinPro from 'paycoinpro';

const client = new PayCoinPro({
  apiKey: 'pk_live_your_api_key',
});

async function main() {
  // Create an invoice
  const invoice = await client.invoices.create({
    amount: 99.99,
    currency: 'USD',
    orderId: 'ORD-123',
    callbackUrl: 'https://yoursite.com/webhooks',
  });
  console.log('Invoice created:', invoice.id);
  console.log('Payment URL:', invoice.paymentUrl);

  // Get invoice
  const fetched = await client.invoices.retrieve(invoice.id);
  console.log('Invoice status:', fetched.status);

  // List invoices
  const invoices = await client.invoices.list({ limit: 10 });
  console.log('Total invoices:', invoices.invoices.length);

  // Create deposit address
  const address = await client.depositAddresses.create({
    assetId: 'asset_usdt_bsc',
  });
  console.log('Deposit address:', address.address);

  // List deposits
  const deposits = await client.deposits.list();
  console.log('Deposits:', deposits.deposits.length);

  // List available assets
  const assetsResponse = await client.assets.list();
  console.log('Available assets:', assetsResponse.assets.length);
  for (const asset of assetsResponse.assets) {
    console.log(`- ${asset.symbol} (${asset.name})`);
  }
}

main().catch(console.error);
