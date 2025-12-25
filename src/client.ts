/**
 * PayCoinPro Client
 */

import type { PayCoinProOptions, WebhookEvent } from './types/index.js';
import { APIClient } from './lib/api.js';
import { Webhooks } from './lib/webhooks.js';
import { Invoices } from './resources/invoices.js';
import { DepositAddresses } from './resources/deposit-addresses.js';
import { Deposits } from './resources/deposits.js';
import { Balances } from './resources/balances.js';
import { Withdrawals } from './resources/withdrawals.js';

/**
 * PayCoinPro SDK Client
 *
 * @example
 * ```typescript
 * import PayCoinPro from 'paycoinpro';
 *
 * const client = new PayCoinPro({
 *   apiKey: 'pk_live_...',
 * });
 *
 * // Create an invoice
 * const invoice = await client.invoices.create({
 *   amount: 99.99,
 *   currency: 'USDT',
 *   network: 'bsc',
 * });
 * ```
 */
export class PayCoinPro {
  /**
   * Invoices API - Create and manage payment invoices
   */
  readonly invoices: Invoices;

  /**
   * Deposit Addresses API - Create and manage deposit addresses
   */
  readonly depositAddresses: DepositAddresses;

  /**
   * Deposits API - View deposit history
   */
  readonly deposits: Deposits;

  /**
   * Balances API - View account balances
   */
  readonly balances: Balances;

  /**
   * Withdrawals API - Create and manage withdrawals
   */
  readonly withdrawals: Withdrawals;

  /**
   * Webhooks utility for signature verification
   */
  readonly webhooks: WebhooksUtil;

  private readonly _client: APIClient;

  /**
   * Create a new PayCoinPro client
   *
   * @param options - Client configuration options
   */
  constructor(options: PayCoinProOptions) {
    this._client = new APIClient(options);

    // Initialize resources
    this.invoices = new Invoices(this._client);
    this.depositAddresses = new DepositAddresses(this._client);
    this.deposits = new Deposits(this._client);
    this.balances = new Balances(this._client);
    this.withdrawals = new Withdrawals(this._client);
    this.webhooks = new WebhooksUtil();
  }
}

/**
 * Webhooks utility class
 *
 * Provides methods for verifying webhook signatures
 */
class WebhooksUtil {
  private readonly _webhooks: Webhooks;

  constructor() {
    this._webhooks = new Webhooks();
  }

  /**
   * Verify a webhook signature and parse the event
   *
   * @param payload - The raw request body as a string or object
   * @param signature - The signature from the x-payload-hash header
   * @param secret - Your webhook secret
   * @returns The parsed webhook event
   * @throws WebhookSignatureError if the signature is invalid
   *
   * @example
   * ```typescript
   * // Express.js example
   * app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
   *   const signature = req.headers['x-payload-hash'];
   *
   *   try {
   *     const event = client.webhooks.verify(
   *       req.body.toString(),
   *       signature,
   *       process.env.WEBHOOK_SECRET
   *     );
   *
   *     switch (event.type) {
   *       case 'invoice.completed':
   *         // Handle completed invoice
   *         break;
   *       case 'deposit.confirmed':
   *         // Handle confirmed deposit
   *         break;
   *     }
   *
   *     res.status(200).send('OK');
   *   } catch (err) {
   *     res.status(400).send('Invalid signature');
   *   }
   * });
   * ```
   */
  verify<T = unknown>(payload: string | object, signature: string, secret: string): WebhookEvent<T> {
    return this._webhooks.verify<T>(payload, signature, secret);
  }

  /**
   * Verify a webhook signature without parsing the event
   *
   * @param payload - The raw request body as a string
   * @param signature - The signature from the x-payload-hash header
   * @param secret - Your webhook secret
   * @returns True if the signature is valid
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    return this._webhooks.verifySignature(payload, signature, secret);
  }

  /**
   * Generate a signature for a payload (useful for testing)
   *
   * @param payload - The payload to sign
   * @param secret - The secret to use for signing
   * @returns The generated signature
   */
  generateSignature(payload: string, secret: string): string {
    return this._webhooks.generateSignature(payload, secret);
  }

  /**
   * Get the signature header name
   */
  get signatureHeader(): string {
    return this._webhooks.signatureHeader;
  }
}

export default PayCoinPro;
