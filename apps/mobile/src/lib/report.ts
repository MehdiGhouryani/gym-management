import { JALALI_MONTHS, gregorianToJalali } from '@fulad/shared';
import type { MonthlyReport } from './api/types';
import { faDigits } from './format';

export interface YearMonth {
  year: number;
  month: number;
}

export function currentMonth(today: string): YearMonth {
  const j = gregorianToJalali(today);
  return { year: j.jy, month: j.jm };
}

export function shiftMonth(ym: YearMonth, delta: -1 | 1): YearMonth {
  let { year, month } = ym;
  month += delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }
  return { year, month };
}

/** ماه آینده گزارشی ندارد */
export function canGoNext(ym: YearMonth, today: string): boolean {
  const cur = currentMonth(today);
  return ym.year < cur.year || (ym.year === cur.year && ym.month < cur.month);
}
/** کمترین ماه قابل‌پرسش در API: فروردین ۱۳۰۲ */
export const canGoPrev = (ym: YearMonth): boolean => ym.year > 1302 || (ym.year === 1302 && ym.month > 1);

export const monthTitle = (ym: YearMonth): string => `${JALALI_MONTHS[ym.month - 1]} ${faDigits(ym.year)}`;
export const isSameMonth = (a: YearMonth, b: YearMonth): boolean => a.year === b.year && a.month === b.month;

/** عدد بر حسب میلیون تومان برای برچسب ستون‌ها: ۱۱٫۲ */
export const millionsOnly = (n: number): string => faDigits(String(Math.round(n / 100_000) / 10).replace('.', '٫'));

/** نسبت ارتفاع هر ستون؛ مقدار کوچک ولی غیرصفر هم دیده می‌شود */
export function weekBars(weeks: number[]) {
  const max = Math.max(0, ...weeks);
  return weeks.map((value, i) => ({
    label: `هفته ${faDigits(i + 1)}`,
    value,
    ratio: max === 0 ? 0 : Math.max(value / max, value > 0 ? 0.04 : 0),
  }));
}

export function changeLabel(percent: number | null): { text: string; tone: 'up' | 'down' | 'flat' | 'none' } {
  if (percent === null) return { text: 'ماه قبل درآمدی ثبت نشده', tone: 'none' };
  if (percent === 0) return { text: 'بدون تغییر نسبت به ماه قبل', tone: 'flat' };
  return { text: `${percent > 0 ? '+' : '−'}${faDigits(Math.abs(percent))}٪ نسبت به ماه قبل`, tone: percent > 0 ? 'up' : 'down' };
}

export function renewalSummary(r: MonthlyReport['renewal']): { value: string; detail: string } {
  return {
    value: r.rate === null ? 'هنوز مشخص نیست' : `${faDigits(r.rate)}٪`,
    detail:
      r.total === 0
        ? 'اشتراکی در این ماه تمام نمی‌شود'
        : `${faDigits(r.renewed)} تمدید، ${faDigits(r.lost)} ازدست‌رفته، ${faDigits(r.pending)} در انتظار`,
  };
}
