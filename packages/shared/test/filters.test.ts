import { describe, it, expect } from 'vitest';
import { addDays, isValidDateOnly, statusFilterRange, subscriptionStatus } from '../src/status.ts';
import type { EndsOnRange, StatusFilter } from '../src/status.ts';

const TODAY = '2026-10-18';
const inRange = (ends: string | null, r: EndsOnRange): boolean => {
  if ('isNull' in r) return ends === null;
  if (ends === null) return false;
  return (r.gt === undefined || ends > r.gt) && (r.gte === undefined || ends >= r.gte) &&
    (r.lt === undefined || ends < r.lt) && (r.lte === undefined || ends <= r.lte);
};
const DATED: StatusFilter[] = ['active', 'expiring', 'expired', 'lapsed'];

describe('statusFilterRange هم‌خوان با subscriptionStatus', () => {
  for (const opts of [{}, { expiringDays: 3, graceDays: 5 }]) {
    it(`هر روز دقیقاً در یک فیلد است ${JSON.stringify(opts)}`, () => {
      for (let off = -40; off <= 40; off++) {
        const ends = addDays(TODAY, off);
        const s = subscriptionStatus(ends, TODAY, opts);
        const hits = DATED.filter((f) => inRange(ends, statusFilterRange(f, TODAY, opts)));
        const expected = s.status === 'ACTIVE' ? 'active' : s.status === 'EXPIRING' ? 'expiring' : s.followUp ? 'expired' : 'lapsed';
        expect(hits.join()).toBe(expected);
      }
    });
  }
  it('بدون اشتراک', () => {
    expect(inRange(null, statusFilterRange('none', TODAY))).toBe(true);
    expect(inRange(TODAY, statusFilterRange('none', TODAY))).toBe(false);
    expect(DATED.some((f) => inRange(null, statusFilterRange(f, TODAY)))).toBe(false);
  });
  it('مرزها', () => {
    expect(statusFilterRange('expiring', TODAY)).toEqual({ gte: '2026-10-18', lte: '2026-10-25' });
    expect(statusFilterRange('expired', TODAY)).toEqual({ lt: '2026-10-18', gte: '2026-10-04' });
    expect(statusFilterRange('active', TODAY)).toEqual({ gt: '2026-10-25' });
    expect(statusFilterRange('lapsed', TODAY)).toEqual({ lt: '2026-10-04' });
  });
});

describe('تاریخ', () => {
  it('addDays از مرز ماه و سال می‌گذرد', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('isValidDateOnly', () => {
    expect(isValidDateOnly('2026-10-18')).toBe(true);
    expect(isValidDateOnly('2028-02-29')).toBe(true);
    expect(isValidDateOnly('2026-02-29')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-10-18T00:00')).toBe(false);
    expect(isValidDateOnly('26-10-18')).toBe(false);
  });
});
