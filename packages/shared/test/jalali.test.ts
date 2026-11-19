import { describe, it, expect } from 'vitest';
import {
  gregorianToJalali,
  isJalaliLeap,
  jalaliMonthLength,
  jalaliMonthRange,
  jalaliToGregorian,
  previousJalaliMonth,
} from '../src/jalali.ts';
import { addDays } from '../src/status.ts';

describe('نوروز سال‌ها', () => {
  const nowruz: [number, string][] = [
    [1395, '2016-03-20'], [1396, '2017-03-21'], [1398, '2019-03-21'], [1399, '2020-03-20'],
    [1400, '2021-03-21'], [1402, '2023-03-21'], [1403, '2024-03-20'], [1404, '2025-03-21'],
    [1405, '2026-03-21'], [1406, '2027-03-21'], [1407, '2028-03-20'],
  ];
  for (const [jy, g] of nowruz) {
    it(`۱ فروردین ${jy}`, () => {
      expect(jalaliToGregorian(jy, 1, 1)).toBe(g);
    });
  }
});

describe('سال کبیسه', () => {
  it('سال‌های شناخته‌شده', () => {
    for (const y of [1395, 1399, 1403, 1408]) expect(isJalaliLeap(y)).toBe(true);
    for (const y of [1400, 1401, 1402, 1404, 1405, 1406, 1407]) expect(isJalaliLeap(y)).toBe(false);
  });
  it('در هر ۳۳ سال دقیقاً ۸ کبیسه', () => {
    for (let y0 = 1301; y0 <= 1400; y0++) {
      let n = 0;
      for (let y = y0; y < y0 + 33; y++) if (isJalaliLeap(y)) n++;
      expect(n).toBe(8);
    }
  });
  it('طول ماه‌ها', () => {
    expect(jalaliMonthLength(1405, 6)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
    expect(jalaliMonthLength(1405, 12)).toBe(29);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
  });
});

describe('ماه‌های ۱۴۰۵', () => {
  it('اول هر ماه', () => {
    const starts = ['2026-03-21', '2026-04-21', '2026-05-22', '2026-06-22', '2026-07-23', '2026-08-23',
      '2026-09-23', '2026-10-23', '2026-11-22', '2026-12-22', '2027-01-21', '2027-02-20'];
    starts.forEach((g, i) => expect(jalaliToGregorian(1405, i + 1, 1)).toBe(g));
  });
  it('بازه‌ی مهر و اسفند', () => {
    expect(jalaliMonthRange(1405, 7)).toEqual({ from: '2026-09-23', to: '2026-10-22' });
    expect(jalaliMonthRange(1405, 12)).toEqual({ from: '2027-02-20', to: '2027-03-20' });
    expect(jalaliMonthRange(1403, 12)).toEqual({ from: '2025-02-19', to: '2025-03-20' });
  });
  it('تبدیل برعکس', () => {
    expect(gregorianToJalali('2026-10-12')).toEqual({ jy: 1405, jm: 7, jd: 20 });
    expect(gregorianToJalali('2026-03-21')).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(gregorianToJalali('2026-03-20')).toEqual({ jy: 1404, jm: 12, jd: 29 });
    expect(gregorianToJalali('2025-03-20')).toEqual({ jy: 1403, jm: 12, jd: 30 });
  });
  it('ماه قبل', () => {
    expect(previousJalaliMonth(1405, 7)).toEqual({ jy: 1405, jm: 6 });
    expect(previousJalaliMonth(1405, 1)).toEqual({ jy: 1404, jm: 12 });
  });
});

describe('خاصیت‌های کلی', () => {
  it('رفت‌وبرگشت برای ۲۰۰۰ تا ۲۰۶۰ و روزها پیوسته‌اند', () => {
    let day = '2000-01-01';
    let prev = gregorianToJalali(day);
    let bad = 0;
    for (let i = 0; i < 22_000; i++) {
      const j = gregorianToJalali(day);
      if (jalaliToGregorian(j.jy, j.jm, j.jd) !== day) bad++;
      if (i > 0) {
        const sameMonth = j.jy === prev.jy && j.jm === prev.jm && j.jd === prev.jd + 1;
        const nextMonth = j.jd === 1 && prev.jd === jalaliMonthLength(prev.jy, prev.jm) &&
          ((j.jy === prev.jy && j.jm === prev.jm + 1) || (j.jy === prev.jy + 1 && j.jm === 1 && prev.jm === 12));
        if (!sameMonth && !nextMonth) bad++;
      }
      prev = j;
      day = addDays(day, 1);
    }
    expect(bad).toBe(0);
  });
});
