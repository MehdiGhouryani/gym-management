import { JALALI_MONTHS, gregorianToJalali, jalaliMonthRange, previousJalaliMonth } from '@fulad/shared';

export interface TrendMonth {
  jy: number;
  jm: number;
  /** برچسب فارسی ماه، مثل «مهر» */
  label: string;
  from: string;
  to: string;
}

/** n ماه اخیر (شامل ماه جاری) از قدیم به جدید، برای روند درآمد داشبورد */
export function buildTrendRanges(today: string, months: number): TrendMonth[] {
  const now = gregorianToJalali(today);
  const chain: { jy: number; jm: number }[] = [];
  let cur = { jy: now.jy, jm: now.jm };
  for (let i = 0; i < months; i++) {
    chain.unshift(cur);
    cur = previousJalaliMonth(cur.jy, cur.jm);
  }
  return chain.map((m) => {
    const range = jalaliMonthRange(m.jy, m.jm);
    return { jy: m.jy, jm: m.jm, label: JALALI_MONTHS[m.jm - 1], from: range.from, to: range.to };
  });
}
