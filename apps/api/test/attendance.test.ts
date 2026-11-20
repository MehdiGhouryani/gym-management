import { describe, it, expect } from 'vitest';
import { checkInPermission, hoursHistogram, isWithinDuplicateWindow } from '../src/attendance/checkin-logic.ts';

describe('اجازه‌ی ورود', () => {
  it('بدون اشتراک رد می‌شود', () => {
    expect(checkInPermission({ status: 'NONE', planKind: 'days', sessionsRemaining: null })).toEqual({ ok: false, reason: 'NO_SUBSCRIPTION' });
  });
  it('منقضی رد می‌شود؛ نزدیک انقضا و فعال عبور می‌کنند', () => {
    expect(checkInPermission({ status: 'EXPIRED', planKind: 'days', sessionsRemaining: null })).toEqual({ ok: false, reason: 'SUBSCRIPTION_ENDED' });
    expect(checkInPermission({ status: 'EXPIRING', planKind: 'days', sessionsRemaining: null })).toEqual({ ok: true });
    expect(checkInPermission({ status: 'ACTIVE', planKind: 'days', sessionsRemaining: null })).toEqual({ ok: true });
  });
  it('پلن جلسه‌ای با جلسه‌ی صفر رد می‌شود', () => {
    expect(checkInPermission({ status: 'ACTIVE', planKind: 'sessions', sessionsRemaining: 0 })).toEqual({ ok: false, reason: 'NO_SESSIONS' });
    expect(checkInPermission({ status: 'ACTIVE', planKind: 'sessions', sessionsRemaining: 1 })).toEqual({ ok: true });
  });
});

describe('پنجره‌ی ضدتکرار', () => {
  it('داخل ۴ ساعت تکراری است', () => {
    expect(isWithinDuplicateWindow('2026-11-20T10:00:00Z', '2026-11-20T11:30:00Z')).toBe(true);
    expect(isWithinDuplicateWindow('2026-11-20T10:00:00Z', '2026-11-20T15:00:00Z')).toBe(false);
    expect(isWithinDuplicateWindow('2026-11-20T10:00:00Z', '2026-11-20T09:00:00Z')).toBe(false);
  });
});

describe('ساعت‌های شلوغ', () => {
  it('هیستوگرام ۲۴ ساعته', () => {
    const h = hoursHistogram([new Date('2026-11-20T08:00:00'), new Date('2026-11-20T08:30:00'), new Date('2026-11-20T18:00:00')]);
    expect(h[8]).toBe(2);
    expect(h[18]).toBe(1);
    expect(h.reduce((a, b) => a + b)).toBe(3);
  });
});
