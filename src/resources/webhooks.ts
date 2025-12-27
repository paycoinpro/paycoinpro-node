import { createHmac, timingSafeEqual } from 'crypto';

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

export interface WebhookEvent {
  event: string;
  status: string;
  timestamp: string;
  [key: string]: unknown;
}

export class Webhooks {
  private defaultTolerance = 300; // 5 minutes

  /**
   * Parse Stripe-style signature header
   * Format: t={timestamp},v1={signature}
   */
  private parseHeader(header: string): { timestamp: number; signature: string } {
    const parts = header.split(',');
    let timestamp = 0;
    let signature = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
      } else if (key === 'v1') {
        signature = value;
      }
    }

    if (!timestamp || !signature) {
      throw new WebhookVerificationError(
        'Invalid signature header format. Expected: t={timestamp},v1={signature}'
      );
    }

    return { timestamp, signature };
  }

  /**
   * Timing-safe string comparison
   */
  private secureCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');

      if (bufA.length !== bufB.length) {
        return false;
      }

      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook signature and parse event.
   *
   * @param rawBody - Raw request body as STRING (not parsed JSON object)
   * @param signatureHeader - Value of X-Webhook-Signature header
   * @param secret - Your webhook secret from PayCoinPro dashboard
   * @param toleranceSeconds - Max webhook age in seconds (default: 300)
   * @returns Parsed webhook event
   * @throws WebhookVerificationError if verification fails
   *
   * @example
   * ```typescript
   * // Express with raw body
   * app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
   *   const rawBody = req.body.toString('utf8');
   *   const signature = req.headers['x-webhook-signature'] as string;
   *
   *   try {
   *     const event = client.webhooks.verify(rawBody, signature, process.env.WEBHOOK_SECRET);
   *
   *     if (event.event === 'invoice') {
   *       // Handle invoice event
   *     } else if (event.event === 'deposit') {
   *       // Handle deposit event
   *     }
   *
   *     res.json({ received: true });
   *   } catch (error) {
   *     res.status(401).json({ error: error.message });
   *   }
   * });
   * ```
   */
  verify(
    rawBody: string,
    signatureHeader: string,
    secret: string,
    toleranceSeconds?: number
  ): WebhookEvent {
    if (!signatureHeader) {
      throw new WebhookVerificationError('Missing webhook signature header');
    }

    if (!secret) {
      throw new WebhookVerificationError('Missing webhook secret');
    }

    if (typeof rawBody !== 'string') {
      throw new WebhookVerificationError(
        'Raw body must be a string. Do not pass parsed JSON object.'
      );
    }

    // Parse the signature header
    const { timestamp, signature } = this.parseHeader(signatureHeader);

    // Replay protection - check timestamp tolerance
    const tolerance = toleranceSeconds ?? this.defaultTolerance;
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    if (age > tolerance) {
      throw new WebhookVerificationError(
        `Webhook timestamp too old. Age: ${age}s, Tolerance: ${tolerance}s`
      );
    }

    if (age < -tolerance) {
      throw new WebhookVerificationError(`Webhook timestamp is in the future. Check server clock.`);
    }

    // Reconstruct the signed payload and compute expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

    // Timing-safe comparison
    if (!this.secureCompare(signature, expected)) {
      throw new WebhookVerificationError('Invalid webhook signature');
    }

    // Parse and return the event
    try {
      return JSON.parse(rawBody) as WebhookEvent;
    } catch {
      throw new WebhookVerificationError('Invalid JSON in webhook body');
    }
  }

  /**
   * Generate signature for testing purposes.
   *
   * @param payload - JSON payload object
   * @param secret - Webhook secret
   * @param timestamp - Unix timestamp (optional, defaults to now)
   * @returns Signature header value (t={timestamp},v1={signature})
   */
  sign(payload: object, secret: string, timestamp?: number): string {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    const body = JSON.stringify(payload);
    const signedPayload = `${ts}.${body}`;
    const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${ts},v1=${signature}`;
  }
}
