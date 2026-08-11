import { createHmac, timingSafeEqual } from 'node:crypto';
import { WebhookVerificationError } from '../lib/errors.js';

const SIGNATURE_VERSION = 'v1';
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface WebhookHeaders {
  [name: string]: string | string[] | undefined;
}

export interface WebhookEvent {
  /** Event type, e.g. `invoice.paid.v1`. */
  type: string;
  /** From X-PayCoinPro-Event-Id. Deduplicate on this — deliveries repeat. */
  eventId: string;
  [key: string]: unknown;
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function constantTimeEquals(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export class Webhooks {
  /**
   * Verify a delivery and return the parsed event.
   *
   * @param rawBody Exact request body as a string, before any JSON parsing.
   * @param headers The request headers; matched case-insensitively.
   * @param secret The endpoint secret returned once at creation or rotation.
   * @param toleranceSeconds Maximum accepted clock skew. Default 300.
   *
   * @example Fastify
   * ```ts
   * fastify.post('/webhooks', async (request, reply) => {
   *   const event = client.webhooks.verify(request.rawBody, request.headers, SECRET);
   *   if (await alreadyProcessed(event.eventId)) return reply.send('OK');
   *   await handle(event);
   *   return reply.send('OK');
   * });
   * ```
   */
  verify(
    rawBody: string,
    headers: WebhookHeaders,
    secret: string,
    toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS
  ): WebhookEvent {
    if (typeof rawBody !== 'string') {
      throw new WebhookVerificationError(
        'Raw body must be a string. Do not pass a parsed JSON object — the signature ' +
          'covers the exact bytes received.'
      );
    }
    if (!secret) {
      throw new WebhookVerificationError('Missing webhook secret');
    }

    const signatureHeader = header(headers, 'X-PayCoinPro-Signature');
    const timestampHeader = header(headers, 'X-PayCoinPro-Timestamp');
    const eventId = header(headers, 'X-PayCoinPro-Event-Id');

    if (!signatureHeader) {
      throw new WebhookVerificationError('Missing X-PayCoinPro-Signature header');
    }
    if (!timestampHeader) {
      throw new WebhookVerificationError('Missing X-PayCoinPro-Timestamp header');
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      throw new WebhookVerificationError(`Invalid timestamp header: ${timestampHeader}`);
    }

    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > toleranceSeconds) {
      throw new WebhookVerificationError(
        `Webhook timestamp too old. Age ${age}s exceeds tolerance ${toleranceSeconds}s.`
      );
    }
    if (age < -toleranceSeconds) {
      throw new WebhookVerificationError(
        'Webhook timestamp is in the future. Check the server clock.'
      );
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    // The header carries up to two signatures during a secret rotation
    // overlap. Accept if either matches.
    const candidates = signatureHeader
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${SIGNATURE_VERSION}=`))
      .map((part) => part.slice(SIGNATURE_VERSION.length + 1));

    if (candidates.length === 0) {
      throw new WebhookVerificationError(
        `No ${SIGNATURE_VERSION} signature found in X-PayCoinPro-Signature`
      );
    }
    if (!candidates.some((candidate) => constantTimeEquals(candidate, expected))) {
      throw new WebhookVerificationError('Invalid webhook signature');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new WebhookVerificationError('Invalid JSON in webhook body');
    }

    return { ...parsed, eventId: eventId ?? '' } as WebhookEvent;
  }

  /** Produce a signature header. For tests and local fixtures only. */
  sign(rawBody: string, secret: string, timestamp: number): string {
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    return `${SIGNATURE_VERSION}=${signature}`;
  }
}
