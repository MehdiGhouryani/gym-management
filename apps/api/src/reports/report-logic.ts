import { addDays, gregorianToJalali, todayInTehran } from '@fulad/shared';

export interface PaymentRow {
  amount: number;
  method: string;
  paidAt: Date;
}

/** تاریخ هر پرداخت به وقت تهران حساب می‌شود، نه UTC */
export function aggregatePayments(rows: PaymentRow[], range: { from: string; to: string }) {
  const weeks = [0, 0, 0, 0];
  const byMethod: Record<string, number> = { CASH: 0, CARD: 0, POS: 0 };
  let total = 0;
  let count = 0;
  for (const r of rows) {
    const day = todayInTehran(r.paidAt);
    if (day < range.from || day > range.to) continue;
    // هفته‌ها: روز ۱ تا ۷، ۸ تا ۱۴، ۱۵ تا ۲۱ و ۲۲ تا آخر ماه
    const week = Math.min(3, Math.floor((gregorianToJalali(day).jd - 1) / 7));
    weeks[week] = (weeks[week] ?? 0) + r.amount;
    byMethod[r.method] = (byMethod[r.method] ?? 0) + r.amount;
    total += r.amount;
    count++;
  }
  return { total, count, byMethod, weeks };
}

/** درصد تغییر نسبت به دوره‌ی قبل؛ اگر دوره‌ی قبل صفر بود null */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * نرخ تمدید ماه: از اشتراک‌هایی که در این ماه تمام می‌شوند، چند درصد در مهلت پیگیری
 * (تا graceDays روز بعد از پایان) اشتراک جدید گرفته‌اند.
 * اگر مهلت هنوز تمام نشده و تمدید نکرده‌اند، در «pending» می‌مانند و در نرخ حساب نمی‌شوند.
 */
export function computeRenewalRate(
  ended: { memberId: string; endsOn: string }[],
  later: { memberId: string; startsOn: string }[],
  today: string,
  graceDays: number,
) {
  const startsByMember = new Map<string, string[]>();
  for (const l of later) {
    const list = startsByMember.get(l.memberId);
    if (list) list.push(l.startsOn);
    else startsByMember.set(l.memberId, [l.startsOn]);
  }
  let renewed = 0;
  let lost = 0;
  let pending = 0;
  for (const e of ended) {
    const limit = addDays(e.endsOn, graceDays);
    const did = (startsByMember.get(e.memberId) ?? []).some((s) => s > e.endsOn && s <= limit);
    if (did) renewed++;
    else if (limit >= today) pending++;
    else lost++;
  }
  const decided = renewed + lost;
  return { total: ended.length, renewed, lost, pending, rate: decided === 0 ? null : Math.round((renewed / decided) * 100) };
}
