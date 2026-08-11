import { describe, expect, it } from 'vitest';
import { idempotencyKeyFor } from '../src/lib/idempotency.js';

describe('idempotencyKeyFor', () => {
  it('joins scope and id', () => {
    expect(idempotencyKeyFor('invoice', 'dep_42')).toBe('invoice:dep_42');
  });

  it('is stable for the same inputs', () => {
    expect(idempotencyKeyFor('invoice', 'dep_42')).toBe(idempotencyKeyFor('invoice', 'dep_42'));
  });

  it('rejects characters the API will not accept', () => {
    expect(() => idempotencyKeyFor('invoice', 'dep 42')).toThrow(/pattern/i);
    expect(() => idempotencyKeyFor('invoice', 'dep/42')).toThrow(/pattern/i);
  });

  it('rejects a result longer than the 200-character API limit', () => {
    expect(() => idempotencyKeyFor('invoice', 'x'.repeat(200))).toThrow(/200/);
  });
});
