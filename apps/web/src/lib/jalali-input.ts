import { gregorianToJalali, jalaliMonthLength, jalaliToGregorian, normalizeDigits } from '@fulad/shared';

/**
 * ورودی تاریخ شمسی کاربر («۱۴۰۵/۷/۱۲» با ارقام فارسی یا لاتین) → تاریخ میلادی ISO.
 * نامعتبر: null. خالی: null (فیلد اختیاری).
 */
export function parseJalaliDate(input: string): string | null {
  const s = normalizeDigits(input).trim();
  if (!s) return null;
  const m = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(s);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jy < 1302 || jy > 1500 || jm < 1 || jm > 12) return null;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;
  return jalaliToGregorian(jy, jm, jd);
}

/** تاریخ میلادی ISO → رشته‌ی شمسی «1405/07/12» برای نمایش */
export function toJalaliString(iso: string): string {
  const { jy, jm, jd } = gregorianToJalali(iso);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}
