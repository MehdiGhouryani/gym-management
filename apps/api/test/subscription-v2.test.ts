import { describe, it, expect } from 'vitest';
import { cancelledEndsOn, discountPrice, freezeChecks, MAX_FREEZE_PER_ACTION } from '../src/subscriptions/subscription-v2.ts';

describe('تخفیف درصدی', () => {
  it('گرد کردن به تومان', () => {
    expect(discountPrice(450_000, 10)).toBe(405_000);
    expect(discountPrice(100_000, 33)).toBe(67_000);
    expect(discountPrice(123_456, 15)).toBe(104_938);
  });
  it('صفر یا منفی = بدون تخفیف؛ بیش از ۹۹ محدود می‌شود', () => {
    expect(discountPrice(100_000, 0)).toBe(100_000);
    expect(discountPrice(100_000, -5)).toBe(100_000);
    expect(discountPrice(100_000, 150)).toBe(1_000);
  });
});

describe('توقف موقت', () => {
  const base = { frozenDays: 0, endsOn: '2026-12-01', today: '2026-11-20', cancelled: false };
  it('محدوده‌ی مجاز: ۱ تا ۳۰ روز', () => {
    expect(freezeChecks({ ...base, days: 1 })).toEqual({ ok: true });
    expect(freezeChecks({ ...base, days: MAX_FREEZE_PER_ACTION })).toEqual({ ok: true });
    expect(freezeChecks({ ...base, days: 0 }).ok).toBe(false);
    expect(freezeChecks({ ...base, days: 31 }).ok).toBe(false);
  });
  it('سقف مجموع ۳۰ روز', () => {
    expect(freezeChecks({ ...base, days: 10, frozenDays: 20 })).toEqual({ ok: true });
    expect(freezeChecks({ ...base, days: 10, frozenDays: 21 }).ok).toBe(false);
  });
  it('اشتراک گذشته یا لغوشده رد می‌شود', () => {
    expect(freezeChecks({ ...base, days: 5, endsOn: '2026-11-19' })).toEqual({ ok: false, reason: 'PAST' });
    expect(freezeChecks({ ...base, days: 5, cancelled: true })).toEqual({ ok: false, reason: 'CANCELLED' });
  });
});

describe('لغو', () => {
  it('پایان آینده به امروز کوتاه می‌شود', () => {
    expect(cancelledEndsOn('2026-12-01', '2026-11-20')).toBe('2026-11-20');
  });
  it('پایان گذشته دست‌نخورده می‌ماند', () => {
    expect(cancelledEndsOn('2026-11-19', '2026-11-20')).toBe('2026-11-19');
    expect(cancelledEndsOn('2026-11-20', '2026-11-20')).toBe('2026-11-20');
  });
});
