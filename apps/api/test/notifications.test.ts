import { describe, it, expect } from 'vitest';
import { buildRemindersPlan, sentRecently } from '../src/notifications/engine.ts';
import { reminderText } from '../src/notifications/templates.ts';

describe('موتور یادآوری', () => {
  const opts = { today: '2026-11-20', expiringDays: 7, graceDays: 14, last: {} };
  const member = (over: Partial<Parameters<typeof buildRemindersPlan>[0][number]> = {}) => ({
    id: 'm1',
    name: 'رضا',
    phone: '09120000001',
    currentEndsOn: null,
    balance: 0,
    smsOptOut: false,
    ...over,
  });

  it('نزدیک انقضا → expiring', () => {
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-25' })], opts)).toEqual([{ memberId: 'm1', template: 'expiring' }]);
  });
  it('منقضی در مهلت → expired', () => {
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-15' })], opts)).toEqual([{ memberId: 'm1', template: 'expired' }]);
  });
  it('منقضی خارج از مهلت → expired نمی‌گیرد', () => {
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-01' })], opts)).toEqual([]);
  });
  it('بدهکار → debt؛ ترکیب با expiring دو قالب', () => {
    const plan = buildRemindersPlan([member({ currentEndsOn: '2026-11-25', balance: 100 })], opts);
    expect(plan.map((p) => p.template).sort()).toEqual(['debt', 'expiring']);
  });
  it('انصراف از پیامک همه‌چیز را حذف می‌کند', () => {
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-25', balance: 100, smsOptOut: true })], opts)).toEqual([]);
  });
  it('جلوگیری از تکرار: همان قالب در ۳ روز اخیر دوباره صف نمی‌شود', () => {
    const withLast = { ...opts, last: { 'm1:expiring': '2026-11-19' } };
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-25' })], withLast)).toEqual([]);
    const older = { ...opts, last: { 'm1:expiring': '2026-11-10' } };
    expect(buildRemindersPlan([member({ currentEndsOn: '2026-11-25' })], older)).toEqual([{ memberId: 'm1', template: 'expiring' }]);
  });
  it('sentRecently مرز دقیق', () => {
    expect(sentRecently('2026-11-18', '2026-11-20')).toBe(true);
    expect(sentRecently('2026-11-17', '2026-11-20')).toBe(false);
    expect(sentRecently(undefined, '2026-11-20')).toBe(false);
  });
});

describe('قالب پیام‌ها', () => {
  it('expiring با روز و لینک', () => {
    const t = reminderText('expiring', { name: 'رضا', gymName: 'باشگاه فولاد', daysLeft: 3, slug: 'fulad-gym' });
    expect(t).toContain('۳ روز');
    expect(t).toContain('باشگاه فولاد');
  });
  it('debt با مبلغ فارسی', () => {
    const t = reminderText('debt', { name: 'رضا', gymName: 'باشگاه فولاد', balance: 450_000 });
    expect(t).toContain('۴۵۰٬۰۰۰');
  });
});
