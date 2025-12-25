import PayCoinPro from 'paycoinpro';

const client = new PayCoinPro({
  apiKey: 'pk_live_your_api_key',
});

async function main() {
  // Create an invoice
  const invoice = await client.invoices.create({
    amount: 99.99,
    currency: 'USDT',
    network: 'bsc',
    orderId: 'ORD-123',
    webhookUrl: 'https://yoursite.com/webhooks',
  });
  console.log('Invoice created:', invoice.id);
  console.log('Payment address:', invoice.paymentAddress);

  // Get invoice
  const fetched = await client.invoices.retrieve(invoice.id);
  console.log('Invoice status:', fetched.status);

  // List invoices
  const invoices = await client.invoices.list({ limit: 10 });
  console.log('Total invoices:', invoices.data.length);

  // Create deposit address
  const address = await client.depositAddresses.create({
    asset: 'USDT',
    network: 'bsc',
  });
  console.log('Deposit address:', address.address);

  // List deposits
  const deposits = await client.deposits.list();
  console.log('Deposits:', deposits.data.length);

  // Create withdrawal
  const withdrawal = await client.withdrawals.create({
    asset: 'USDT',
    network: 'bsc',
    amount: 100,
    address: '0x...',
  });
  console.log('Withdrawal created:', withdrawal.id);
}

main().catch(console.error);
