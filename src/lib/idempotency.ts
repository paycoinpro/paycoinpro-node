/**
 * Build a stable idempotency key.
 *
 * The key must be derived from something durable — an order id, a withdrawal
 * id — and persisted with that record. A key regenerated on retry defeats the
 * header entirely and creates a duplicate.
 */
const API_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;

export function idempotencyKeyFor(scope: string, id: string): string {
  const key = `${scope}:${id}`;

  if (key.length > 200) {
    throw new Error(`Idempotency key exceeds the API limit of 200 characters: ${key.length}`);
  }
  if (!API_PATTERN.test(key)) {
    throw new Error(
      `Idempotency key must match the API pattern [A-Za-z0-9_.:-], received: ${JSON.stringify(key)}`
    );
  }

  return key;
}
