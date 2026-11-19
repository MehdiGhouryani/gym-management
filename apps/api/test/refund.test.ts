import { describe, it, expect } from 'vitest';
import { validateRefund } from '../src/subscriptions/refund-logic.ts';
import { aggregatePayments } from '../src/reports/report-logic.ts';

describe('اعتبارسنجی بازپرداخت', () => {
  it('تا سقف پول خالص مجاز است', () => {
    expect(validateRefund({ amount: 300, netPaid: 500, balance: 0 })).toEqual({ ok: true });
  });
  it('بیش از پول خالص رد می‌شود', () => {
    expect(validateRefund({ amount: 600, netPaid: 500, balance: 0 })).toEqual({ ok: false, reason: 'EXCEEDS_NET_PAID' });
  });
  it('مانده منفی نمی‌شود (بدهکار بازپرداخت نمی‌گیرد)', () => {
    expect(validateRefund({ amount: 100, netPaid: 500, balance: -200 })).toEqual({ ok: false, reason: 'WOULD_NEGATE_BALANCE' });
    expect(validateRefund({ amount: 200, netPaid: 500, balance: -200 })).toEqual({ ok: true });
  });
});

describe('درآمد با بازپرداخت', () => {
  const range = { from: '2026-11-01', to: '2026-11-30' };
  const payments = [
    { amount: 100, method: 'CASH', paidAt: new Date('2026-11-05T10:00:00Z') },
    { amount: 200, method: 'CARD', paidAt: new Date('2026-11-06T10:00:00Z') },
  ];
  it('بازپرداخت از درآمد همان دوره کم می‌شود', () => {
    const refunds = [{ amount: 50, method: 'CASH', paidAt: new Date('2026-11-07T10:00:00Z') }];
    const r = aggregatePayments(payments, range, refunds);
    expect(r.total).toBe(250);
    expect(r.byMethod.CASH).toBe(50);
    expect(r.count).toBe(1);
  });
  it('بازپرداخت خارج از دوره بی‌اثر است', () => {
    const refunds = [{ amount: 50, method: 'CASH', paidAt: new Date('2026-12-01T10:00:00Z') }];
    expect(aggregatePayments(payments, range, refunds).total).toBe(300);
  });
});
