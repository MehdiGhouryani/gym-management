import { describe, it, expect } from 'vitest';
import { paymentsWhere, tehranDayWindow } from '../src/payments/payments-query.ts';

describe('پنجره‌ی روز تهران', () => {
  it('شروع و پایان روز تهران (+۰۳:۳۰)', () => {
    const w = tehranDayWindow('2026-10-18', '2026-10-20');
    expect(w.gte.toISOString()).toBe('2026-10-17T20:30:00.000Z');
    expect(w.lt.toISOString()).toBe('2026-10-19T20:30:00.000Z');
  });
});

describe('شرط فهرست پرداخت‌ها', () => {
  it('بدون فیلتر فقط باشگاه', () => {
    expect(paymentsWhere('g1', {})).toEqual({ gymId: 'g1' });
  });
  it('جستجوی رقمی روی شماره', () => {
    const w = paymentsWhere('g1', { q: '0912' });
    expect(w.subscription).toEqual({ member: { phone: { contains: '0912' } } });
  });
  it('جستجوی متنی روی نام', () => {
    const w = paymentsWhere('g1', { q: 'رضا' });
    const member = (w.subscription as { member: Record<string, unknown> }).member;
    expect(member).toHaveProperty('name');
  });
  it('بازه‌ی کامل روی paidAt', () => {
    const w = paymentsWhere('g1', { from: '2026-10-18', to: '2026-10-20' });
    expect(w.paidAt).toHaveProperty('gte');
    expect(w.paidAt).toHaveProperty('lt');
  });
});
