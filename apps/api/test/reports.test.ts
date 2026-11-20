import { describe, it, expect } from 'vitest';
import { aggregatePayments, computeRenewalRate, percentChange, planBreakdown, staffPerformance } from '../src/reports/report-logic.ts';

const MEHR = { from: '2026-09-23', to: '2026-10-22' };
const pay = (amount: number, method: string, iso: string) => ({ amount, method, paidAt: new Date(iso) });

describe('aggregatePayments', () => {
  it('مرز ماه به وقت تهران (نیمه‌شب = ۲۰:۳۰ UTC)', () => {
    const r = aggregatePayments(
      [pay(100, 'CASH', '2026-09-22T20:29:59Z'), pay(200, 'CASH', '2026-09-22T20:30:00Z')],
      MEHR,
    );
    expect(r.total).toBe(200);
    expect(r.count).toBe(1);
  });
  it('آخرین روز ماه داخل و روز بعد بیرون است', () => {
    const r = aggregatePayments(
      [pay(5, 'CARD', '2026-10-22T20:29:59Z'), pay(7, 'CARD', '2026-10-22T20:30:00Z')],
      MEHR,
    );
    expect(r.total).toBe(5);
  });
  it('هفته‌ها: ۱ تا ۷، ۸ تا ۱۴، ۱۵ تا ۲۱، ۲۲ تا آخر', () => {
    const r = aggregatePayments(
      [
        pay(1, 'CASH', '2026-09-29T09:00:00Z'), // ۷ مهر
        pay(10, 'CASH', '2026-09-30T09:00:00Z'), // ۸ مهر
        pay(100, 'POS', '2026-10-13T09:00:00Z'), // ۲۱ مهر
        pay(1000, 'CARD', '2026-10-14T09:00:00Z'), // ۲۲ مهر
        pay(10000, 'CARD', '2026-10-22T09:00:00Z'), // ۳۰ مهر
      ],
      MEHR,
    );
    expect(r.weeks).toEqual([1, 10, 100, 11000]);
    expect(r.byMethod).toEqual({ CASH: 11, CARD: 11000, POS: 100 });
    expect(r.total).toBe(11111);
    expect(r.count).toBe(5);
  });
  it('بدون پرداخت', () => {
    expect(aggregatePayments([], MEHR)).toEqual({ total: 0, count: 0, byMethod: { CASH: 0, CARD: 0, POS: 0 }, weeks: [0, 0, 0, 0] });
  });
});

describe('percentChange', () => {
  it('مقدارها', () => {
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(5, 10)).toBe(-50);
    expect(percentChange(2, 3)).toBe(-33);
    expect(percentChange(10, 10)).toBe(0);
  });
  it('دوره‌ی قبل صفر', () => {
    expect(percentChange(3, 0)).toBe(null);
    expect(percentChange(0, 0)).toBe(null);
  });
});

describe('computeRenewalRate', () => {
  const ended = [
    { memberId: 'a', endsOn: '2026-10-10' },
    { memberId: 'b', endsOn: '2026-10-10' },
    { memberId: 'c', endsOn: '2026-10-10' },
    { memberId: 'd', endsOn: '2026-10-10' },
  ];
  const later = [
    { memberId: 'a', startsOn: '2026-10-11' }, // بلافاصله
    { memberId: 'b', startsOn: '2026-10-24' }, // آخرین روز مهلت
    { memberId: 'c', startsOn: '2026-10-25' }, // خارج از مهلت
    { memberId: 'x', startsOn: '2026-10-11' }, // عضو دیگر
  ];
  it('بعد از پایان مهلت: تمدیدشده و ازدست‌رفته', () => {
    expect(computeRenewalRate(ended, later, '2026-11-30', 14)).toEqual({ total: 4, renewed: 2, lost: 2, pending: 0, rate: 50 });
  });
  it('هنوز در مهلت: pending و خارج از نرخ', () => {
    expect(computeRenewalRate(ended, later, '2026-10-20', 14)).toEqual({ total: 4, renewed: 2, lost: 0, pending: 2, rate: 100 });
  });
  it('فقط pending: نرخ null', () => {
    expect(computeRenewalRate([{ memberId: 'a', endsOn: '2026-10-10' }], [], '2026-10-12', 14).rate).toBe(null);
  });
  it('بدون اشتراکِ تمام‌شده', () => {
    expect(computeRenewalRate([], [], '2026-10-12', 14)).toEqual({ total: 0, renewed: 0, lost: 0, pending: 0, rate: null });
  });
  it('آخرین روز مهلت هنوز pending است', () => {
    expect(computeRenewalRate([{ memberId: 'a', endsOn: '2026-10-10' }], [], '2026-10-24', 14).pending).toBe(1);
    expect(computeRenewalRate([{ memberId: 'a', endsOn: '2026-10-10' }], [], '2026-10-25', 14).lost).toBe(1);
  });
});

describe('عملکرد پلن‌ها', () => {
  it('شمارش، درآمد و سهم درصدی', () => {
    const r = planBreakdown([
      { planId: 'a', planName: 'یک‌ماهه', price: 450 },
      { planId: 'a', planName: 'یک‌ماهه', price: 450 },
      { planId: 'b', planName: 'سه‌ماهه', price: 1200 },
    ]);
    expect(r.total).toBe(3);
    expect(r.items[0].count).toBe(2);
    expect(r.items[0].sharePercent).toBe(67);
    expect(r.items[1].revenue).toBe(1200);
  });
  it('دوره خالی', () => {
    expect(planBreakdown([])).toEqual({ items: [], total: 0 });
  });
});

describe('عملکرد کارکنان', () => {
  it('تمدید و پرداخت به تفکیک کارمند و مرتب‌سازی بر اساس وصولی', () => {
    const r = staffPerformance([
      { actorId: 's1', action: 'subscription.create', meta: { price: 450 } },
      { actorId: 's1', action: 'payment.debt', meta: { amount: 100 } },
      { actorId: 's2', action: 'subscription.create', meta: { price: 1200 } },
      { actorId: 's2', action: 'member.archive', meta: null },
    ]);
    expect(r.length).toBe(2);
    expect(r[0].actorId).toBe('s2');
    expect(r[1].renewals).toBe(1);
    expect(r[1].payments).toBe(1);
    expect(r[1].collected).toBe(550);
  });
});
