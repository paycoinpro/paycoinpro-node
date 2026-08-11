import { expectTypeOf, test } from 'vitest';
import type {
  InvoiceResource,
  CreateInvoiceRequest,
  ApiError,
  BalancesResponse,
} from '../src/types/index.js';

test('invoice fiat amount is an exact string, never a number', () => {
  expectTypeOf<InvoiceResource['fiat']['amount']>().toEqualTypeOf<string>();
  expectTypeOf<CreateInvoiceRequest['fiatAmount']>().toEqualTypeOf<string>();
});

test('invoice carries the v2 status enum', () => {
  expectTypeOf<InvoiceResource['status']>().toMatchTypeOf<
    | 'REQUIRES_PAYMENT_METHOD'
    | 'AWAITING_PAYMENT'
    | 'CONFIRMING'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERPAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'MANUAL_REVIEW'
  >();
});

test('the error envelope carries a request id', () => {
  expectTypeOf<ApiError['requestId']>().toEqualTypeOf<string>();
});

test('balances respond with a defined shape', () => {
  expectTypeOf<BalancesResponse>().not.toBeAny();
});
