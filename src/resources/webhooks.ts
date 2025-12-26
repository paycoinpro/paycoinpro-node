import { createHmac } from 'crypto';
import type { WebhookPayload, DepositWebhookPayload } from '../types/index.js';

export type WebhookEvent = WebhookPayload | DepositWebhookPayload;

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

export class Webhooks {
  constructor(private readonly secret: string) {}

  /**
   * Verify a webhook signature and parse the payload.
   *
   * @param payload - The raw request body (string or object)
   * @param signature - The signature from 'x-payload-hash' header
   * @returns The verified webhook event
   * @throws WebhookVerificationError if signature is invalid
   *
   * @example
   * ```typescript
   * app.post('/webhooks', (req, res) => {
   *   try {
   *     const event = client.webhooks.verify(req.body, req.headers['x-payload-hash']);
   *
   *     if (event.event === 'invoice.paid') {
   *       // Handle paid invoice
   *     }
   *
   *     res.status(200).send('OK');
   *   } catch (error) {
   *     res.status(400).send('Invalid signature');
   *   }
   * });
   * ```
   */
  verify(payload: string | object, signature: string | undefined): WebhookEvent {
    if (!signature) {
      throw new WebhookVerificationError('Missing webhook signature');
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = createHmac('sha512', this.secret)
      .update(payloadString)
      .digest('hex');

    if (!this.secureCompare(signature, expected)) {
      throw new WebhookVerificationError('Invalid webhook signature');
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return event as WebhookEvent;
  }

  /**
   * Generate a signature for testing purposes.
   *
   * @param payload - The payload to sign
   * @returns The HMAC-SHA512 signature
   */
  sign(payload: string | object): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha512', this.secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
