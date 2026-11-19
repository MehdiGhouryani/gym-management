import { describe, it, expect } from 'vitest';
import { groupToday, mergeToday } from '../src/lib/today.ts';
import type { MemberDto } from '../src/lib/api/types.ts';

const m = (id: string, name: string, status: MemberDto['status'], daysLeft: number): MemberDto => ({
  id, name, phone: '09120000000', birthDate: null, note: null, currentEndsOn: null, status, daysLeft,
  followUp: status === 'EXPIRED', balance: 0, archivedAt: null, createdAt: '2026-01-01T00:00:00.000Z',
});

describe('امروز', () => {
  const expiring = [m('a', 'نگار', 'EXPIRING', 3), m('b', 'امیر', 'EXPIRING', 5), m('c', 'کاوه', 'EXPIRING', 2)];
  const expired = [m('d', 'مهدی', 'EXPIRED', -2), m('e', 'مریم', 'EXPIRED', -10)];
  it('ترتیب: بیشترین تأخیر اول، بعد نزدیک‌ترین انقضا', () => {
    expect(mergeToday(expiring, expired).map((x) => x.id).join('')).toBe('edcab');
  });
  it('تکرار حذف می‌شود', () => {
    expect(mergeToday(expiring, expiring).length).toBe(3);
  });
  it('هم‌روزها بر اساس نام', () => {
    const r = mergeToday([m('x', 'ب', 'EXPIRING', 1), m('y', 'الف', 'EXPIRING', 1)]);
    expect(r.map((z) => z.id).join('')).toBe('yx');
  });
  it('گروه‌بندی', () => {
    const g = groupToday(mergeToday(expiring, expired));
    expect(g.expired.length).toBe(2);
    expect(g.expiring.length).toBe(3);
  });
});
