import { toJalali, todayInTehran } from '@fulad/shared';

export interface PaymentRow {
  amount: number;
  method: string;
  paidAt: Date;
}

export interface RevenueSummary {
  total: number;
  count: number;
  byMethod: { CASH: number; CARD: number; POS: number };
  /** ۴ بازه: روزهای ۱ تا ۷، ۸ تا ۱۴، ۱۵ تا ۲۱ و از ۲۲ تا آخر ماه شمسی */
  weeks: [number, number, number, number];
}

/** پرداخت‌ها بر اساس روز تهران و روز ماه شمسی دسته‌بندی می‌شوند (نه ساعت UTC) */
export function summarizeRevenue(rows: PaymentRow[]): RevenueSummary {
  const out: RevenueSummary = { total: 0, count: rows.length, byMethod: { CASH: 0, CARD: 0, POS: 0 }, weeks: [0, 0, 0, 0] };
  for (const r of rows) {
    out.total += r.amount;
    if (r.method === 'CASH' || r.method === 'CARD' || r.method === 'POS') out.byMethod[r.method] += r.amount;
    const day = toJalali(todayInTehran(r.paidAt)).jd;
    const w = Math.min(3, Math.floor((day - 1) / 7));
    out.weeks[w] = (out.weeks[w] as number) + r.amount;
  }
  return out;
}

/** تغییر درصدی نسبت به ماه قبل؛ اگر ماه قبل صفر بوده، null */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
