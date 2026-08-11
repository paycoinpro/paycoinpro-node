import { describe, expect, it } from 'vitest';
import { formatAmount } from '../src/lib/money.js';

describe('formatAmount', () => {
  it('inserts the decimal point without floating point', () => {
    expect(formatAmount('123456', 2)).toBe('1234.56');
    expect(formatAmount('1000000', 6)).toBe('1.000000');
  });

  it('left-pads when the integer part is empty', () => {
    expect(formatAmount('5', 6)).toBe('0.000005');
  });

  it('returns the value unchanged at zero decimals', () => {
    expect(formatAmount('4200', 0)).toBe('4200');
  });

  it('handles zero', () => {
    expect(formatAmount('0', 8)).toBe('0.00000000');
  });

  it('preserves precision far beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatAmount('123456789012345678901234567890', 18)).toBe(
      '123456789012.345678901234567890'
    );
  });

  it('rejects a non-integer-string amount rather than guessing', () => {
    expect(() => formatAmount('1.5', 2)).toThrow(/integer string/i);
    expect(() => formatAmount('', 2)).toThrow(/integer string/i);
  });
});
