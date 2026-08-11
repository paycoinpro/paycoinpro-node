/**
 * Display formatting for exact-string amounts.
 *
 * The return value is for humans only. Never feed it back into the API —
 * the API takes the original integer string.
 */
export function formatAmount(amount: string, decimals: number): string {
  if (!/^(0|[1-9][0-9]*)$/.test(amount)) {
    throw new Error(`Amount must be an exact integer string, received: ${JSON.stringify(amount)}`);
  }
  if (decimals === 0) return amount;

  const padded = amount.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals);

  return `${whole}.${fraction}`;
}
