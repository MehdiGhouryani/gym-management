import { describe, it, expect } from 'vitest';
import { allocatePayment } from '../src/subscriptions/payment-allocation.ts';
import { summarize, toSubscriptionDto } from '../src/subscriptions/subscription.mapper.ts';

const TODAY = '2026-10-18';

describe('allocatePayment', () => {
  const debts = [
    { subscriptionId: 'a', balance: 500 },
    { subscriptionId: 'b', balance: 0 },
    { subscriptionId: 'c', balance: 700 },
  ];
  it('از قدیمی‌ترین شروع می‌شود و صفرها نادیده گرفته می‌شوند', () => {
    expect(allocatePayment(debts, 800)).toEqual({
      allocations: [{ subscriptionId: 'a', amount: 500 }, { subscriptionId: 'c', amount: 300 }],
      remaining: 0,
    });
  });
  it('پرداخت کمتر از اولین بدهی', () => {
    expect(allocatePayment(debts, 200)).toEqual({ allocations: [{ subscriptionId: 'a', amount: 200 }], remaining: 0 });
  });
  it('تسویه‌ی کامل', () => {
    const r = allocatePayment(debts, 1200);
    expect(r.allocations.reduce((s, a) => s + a.amount, 0)).toBe(1200);
    expect(r.remaining).toBe(0);
  });
  it('بیش از بدهی: باقی‌مانده گزارش می‌شود', () => {
    expect(allocatePayment(debts, 1500).remaining).toBe(300);
  });
  it('مبلغ صفر', () => {
    expect(allocatePayment(debts, 0)).toEqual({ allocations: [], remaining: 0 });
  });
});

describe('toSubscriptionDto', () => {
  const row = {
    id: 's1', planId: 'p1', startsOn: new Date('2026-07-31T00:00:00Z'), endsOn: new Date('2026-10-28T00:00:00Z'),
    price: 12_000_000, createdAt: new Date('2026-07-31T08:00:00Z'), plan: { name: 'سه‌ماهه' },
    payments: [
      { id: 'y1', amount: 3_000_000, method: 'CASH', paidAt: new Date('2026-08-10T10:00:00Z') },
      { id: 'y2', amount: 7_800_000, method: 'CARD', paidAt: new Date('2026-07-31T08:00:00Z') },
    ],
  };
  it('پرداخت‌شده و مانده', () => {
    const d = toSubscriptionDto(row);
    expect(d.paid).toBe(10_800_000);
    expect(d.balance).toBe(1_200_000);
    expect(d.startsOn).toBe('2026-07-31');
    expect(d.endsOn).toBe('2026-10-28');
    expect(d.planName).toBe('سه‌ماهه');
    expect(d.payments.length).toBe(2);
  });
  it('بدون پرداخت', () => {
    const d = toSubscriptionDto({ ...row, payments: [] });
    expect(d.paid).toBe(0);
    expect(d.balance).toBe(12_000_000);
  });
  it('جمع کل', () => {
    expect(summarize([{ price: 12_000_000, paid: 10_800_000 }, { price: 4_500_000, paid: 4_500_000 }])).toEqual({
      totalPrice: 16_500_000, totalPaid: 15_300_000, balance: 1_200_000,
    });
  });
});
