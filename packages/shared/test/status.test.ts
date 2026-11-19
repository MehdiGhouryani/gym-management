import { describe, it, expect } from 'vitest';
import { subscriptionStatus, renewalDates, todayInTehran } from '../src/status.ts';

const TODAY = '2026-10-18';

describe('subscriptionStatus', () => {
  it('فعال: بیش از ۷ روز مانده', () => {
    expect(subscriptionStatus('2026-10-26', TODAY)).toEqual({ status: 'ACTIVE', daysLeft: 8, followUp: false });
  });
  it('نزدیک انقضا: دقیقاً ۷ روز مانده', () => {
    expect(subscriptionStatus('2026-10-25', TODAY).status).toBe('EXPIRING');
  });
  it('امروز آخرین روز است: هنوز معتبر و نزدیک انقضا', () => {
    expect(subscriptionStatus(TODAY, TODAY)).toEqual({ status: 'EXPIRING', daysLeft: 0, followUp: false });
  });
  it('منقضی: دیروز تمام شده و در مهلت پیگیری', () => {
    expect(subscriptionStatus('2026-10-17', TODAY)).toEqual({ status: 'EXPIRED', daysLeft: -1, followUp: true });
  });
  it('خارج از مهلت پیگیری بعد از ۱۴ روز', () => {
    expect(subscriptionStatus('2026-10-04', TODAY).followUp).toBe(true);
    expect(subscriptionStatus('2026-10-03', TODAY).followUp).toBe(false);
  });
  it('بدون اشتراک', () => {
    expect(subscriptionStatus(null, TODAY)).toEqual({ status: 'NONE', daysLeft: null, followUp: false });
  });
  it('آستانه‌ی قابل تنظیم', () => {
    expect(subscriptionStatus('2026-10-25', TODAY, { expiringDays: 3 }).status).toBe('ACTIVE');
  });
});

describe('renewalDates', () => {
  it('بدون اشتراک قبلی: از امروز', () => {
    expect(renewalDates(null, 30, TODAY)).toEqual({ startsOn: '2026-10-18', endsOn: '2026-11-16' });
  });
  it('اشتراک معتبر: از روز بعد از پایان فعلی', () => {
    expect(renewalDates('2026-10-25', 30, TODAY)).toEqual({ startsOn: '2026-10-26', endsOn: '2026-11-24' });
  });
  it('اشتراک منقضی: از امروز', () => {
    expect(renewalDates('2026-10-10', 30, TODAY).startsOn).toBe('2026-10-18');
  });
  it('مرز سال', () => {
    expect(renewalDates(null, 30, '2026-12-31')).toEqual({ startsOn: '2026-12-31', endsOn: '2027-01-29' });
  });
});

describe('todayInTehran', () => {
  it('مرز نیمه‌شب تهران (UTC+3:30)', () => {
    expect(todayInTehran(new Date('2026-10-17T20:29:59Z'))).toBe('2026-10-17');
    expect(todayInTehran(new Date('2026-10-17T20:30:00Z'))).toBe('2026-10-18');
  });
});
