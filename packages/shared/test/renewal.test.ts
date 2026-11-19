import { describe, it, expect } from 'vitest';
import { planRenewal } from '../src/renewal.ts';

const TODAY = '2026-10-18';

describe('planRenewal بدون تاریخ دستی', () => {
  it('عضو بدون اشتراک: از امروز', () => {
    expect(planRenewal({ currentEndsOn: null, planDays: 30, today: TODAY })).toEqual({ ok: true, startsOn: '2026-10-18', endsOn: '2026-11-16' });
  });
  it('اشتراک معتبر: از روز بعد از پایان', () => {
    expect(planRenewal({ currentEndsOn: '2026-10-25', planDays: 30, today: TODAY })).toEqual({ ok: true, startsOn: '2026-10-26', endsOn: '2026-11-24' });
  });
  it('امروز آخرین روز است: از فردا', () => {
    expect(planRenewal({ currentEndsOn: TODAY, planDays: 30, today: TODAY })).toEqual({ ok: true, startsOn: '2026-10-19', endsOn: '2026-11-17' });
  });
  it('اشتراک منقضی: از امروز', () => {
    expect(planRenewal({ currentEndsOn: '2026-10-01', planDays: 90, today: TODAY })).toEqual({ ok: true, startsOn: '2026-10-18', endsOn: '2027-01-15' });
  });
  it('پلن یک‌روزه: شروع و پایان یکی است', () => {
    expect(planRenewal({ currentEndsOn: null, planDays: 1, today: TODAY })).toEqual({ ok: true, startsOn: TODAY, endsOn: TODAY });
  });
});

describe('planRenewal با تاریخ دستی', () => {
  it('هم‌پوشانی رد می‌شود', () => {
    expect(planRenewal({ currentEndsOn: '2026-10-25', planDays: 30, today: TODAY, startsOn: '2026-10-25' })).toEqual({ ok: false, reason: 'OVERLAP' });
    expect(planRenewal({ currentEndsOn: '2026-10-25', planDays: 30, today: TODAY, startsOn: '2026-10-20' })).toEqual({ ok: false, reason: 'OVERLAP' });
  });
  it('دقیقاً روز بعد از پایان فعلی مجاز است', () => {
    expect(planRenewal({ currentEndsOn: '2026-10-25', planDays: 30, today: TODAY, startsOn: '2026-10-26' }).ok).toBe(true);
  });
  it('فاصله‌ی بیش از ۶۰ روز رد می‌شود', () => {
    expect(planRenewal({ currentEndsOn: null, planDays: 30, today: TODAY, startsOn: '2026-12-17' }).ok).toBe(true);
    expect(planRenewal({ currentEndsOn: null, planDays: 30, today: TODAY, startsOn: '2026-12-18' })).toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
    expect(planRenewal({ currentEndsOn: null, planDays: 30, today: TODAY, startsOn: '2026-08-19' }).ok).toBe(true);
    expect(planRenewal({ currentEndsOn: null, planDays: 30, today: TODAY, startsOn: '2026-08-18' })).toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
  });
  it('ثبت اشتراک گذشته برای عضو منقضی', () => {
    expect(planRenewal({ currentEndsOn: '2026-09-01', planDays: 30, today: TODAY, startsOn: '2026-10-01' })).toEqual({ ok: true, startsOn: '2026-10-01', endsOn: '2026-10-30' });
  });
});

