/**
 * PayCoinPro Webhook Verification
 */

import { createHmac } from 'crypto';
import type { WebhookEvent } from '../types/index.js';
import { WebhookSignatureError } from './errors.js';

const SIGNATURE_HEADER = 'x-payload-hash';

export class Webhooks {
  /**
   * Verify a webhook signature and parse the event
   *
   * @param payload - The raw request body as a string or object
   * @param signature - The signature from the x-payload-hash header
   * @param secret - Your webhook secret
   * @returns The parsed webhook event
   * @throws WebhookSignatureError if the signature is invalid
   */
  verify<T = unknown>(
    payload: string | object,
    signature: string,
    secret: string
  ): WebhookEvent<T> {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (!this.verifySignature(payloadString, signature, secret)) {
      throw new WebhookSignatureError('Invalid webhook signature');
    }

    try {
      const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
      return event as WebhookEvent<T>;
    } catch {
      throw new WebhookSignatureError('Failed to parse webhook payload');
    }
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
    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload, secret);
    return this.secureCompare(expectedSignature, signature);
  }

  /**
   * Generate a signature for a payload
   *
   * @param payload - The payload to sign
   * @param secret - The secret to use for signing
   * @returns The generated signature
   */
  generateSignature(payload: string, secret: string): string {
    return createHmac('sha512', secret).update(payload).digest('hex');
  }

  /**
   * Get the signature header name
   */
  get signatureHeader(): string {
    return SIGNATURE_HEADER;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
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

/**
 * Extract the signature from request headers
 *
 * @param headers - The request headers (can be Headers, object, or Map)
 * @returns The signature string or undefined if not found
 */
export function getSignatureFromHeaders(
  headers: Headers | Record<string, string | string[] | undefined> | Map<string, string>
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(SIGNATURE_HEADER) ?? undefined;
  }

  if (headers instanceof Map) {
    return headers.get(SIGNATURE_HEADER);
  }

  const value = headers[SIGNATURE_HEADER] ?? headers[SIGNATURE_HEADER.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
