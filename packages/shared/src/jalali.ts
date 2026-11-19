import { fromDayNumber, toDayNumber } from './status';

/**
 * تقویم شمسی با قاعده‌ی ۳۳ساله. نوروز سال‌های ۱۳۹۵ تا ۱۴۰۷ با تاریخ‌های واقعی تست شده است؛
 * برای سال‌های دورتر ممکن است مرز سال با تقویم رسمی (که نجومی اعلام می‌شود) یک روز اختلاف داشته باشد.
 * لنگر: ۱ فروردین ۱۴۰۵ برابر ۲۱ مارس ۲۰۲۶.
 */
export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

export const JALALI_MIN_YEAR = 1301;
export const JALALI_MAX_YEAR = 1500;

const ANCHOR_YEAR = 1405;
const ANCHOR_DAY = toDayNumber('2026-03-21');

export const isJalaliLeap = (jy: number): boolean => (25 * jy + 11) % 33 < 8;
export const jalaliYearLength = (jy: number): number => (isJalaliLeap(jy) ? 366 : 365);

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

function assertYear(jy: number) {
  if (!Number.isInteger(jy) || jy < JALALI_MIN_YEAR || jy > JALALI_MAX_YEAR) {
    throw new RangeError(`سال شمسی باید بین ${JALALI_MIN_YEAR} و ${JALALI_MAX_YEAR} باشد`);
  }
}

/** فاصله‌ی ۱ فروردین سال jy تا ۱ فروردین ۱۴۰۵ (روز) */
function offsetOfYear(jy: number): number {
  let d = 0;
  if (jy >= ANCHOR_YEAR) for (let y = ANCHOR_YEAR; y < jy; y++) d += jalaliYearLength(y);
  else for (let y = jy; y < ANCHOR_YEAR; y++) d -= jalaliYearLength(y);
  return d;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  assertYear(jy);
  if (!Number.isInteger(jm) || jm < 1 || jm > 12) throw new RangeError('ماه نامعتبر است');
  if (!Number.isInteger(jd) || jd < 1 || jd > jalaliMonthLength(jy, jm)) throw new RangeError('روز نامعتبر است');
  let before = 0;
  for (let m = 1; m < jm; m++) before += jalaliMonthLength(jy, m);
  return fromDayNumber(ANCHOR_DAY + offsetOfYear(jy) + before + jd - 1);
}

export function gregorianToJalali(date: string): { jy: number; jm: number; jd: number } {
  const n = toDayNumber(date) - ANCHOR_DAY;
  let jy = ANCHOR_YEAR;
  let start = 0;
  if (n >= 0) {
    while (n >= start + jalaliYearLength(jy)) {
      start += jalaliYearLength(jy);
      jy++;
    }
  } else {
    while (n < start) {
      jy--;
      start -= jalaliYearLength(jy);
    }
  }
  assertYear(jy);
  let rem = n - start;
  let jm = 1;
  while (rem >= jalaliMonthLength(jy, jm)) {
    rem -= jalaliMonthLength(jy, jm);
    jm++;
  }
  return { jy, jm, jd: rem + 1 };
}

/** اولین و آخرین روز ماه شمسی به‌صورت تاریخ میلادی (YYYY-MM-DD، هر دو شامل) */
export function jalaliMonthRange(jy: number, jm: number): { from: string; to: string } {
  return { from: jalaliToGregorian(jy, jm, 1), to: jalaliToGregorian(jy, jm, jalaliMonthLength(jy, jm)) };
}

export const previousJalaliMonth = (jy: number, jm: number): { jy: number; jm: number } =>
  jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 };
