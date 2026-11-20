import { addDays, gregorianToJalali, todayInTehran } from '@fulad/shared';

export interface PaymentRow {
  amount: number;
  method: string;
  paidAt: Date;
}

/** تاریخ هر پرداخت به وقت تهران حساب می‌شود، نه UTC. بازپرداخت‌ها از درآمد همان روز کم می‌شوند */
export function aggregatePayments(rows: PaymentRow[], range: { from: string; to: string }, refunds: PaymentRow[] = []) {
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
  for (const r of refunds) {
    const day = todayInTehran(r.paidAt);
    if (day < range.from || day > range.to) continue;
    byMethod[r.method] = (byMethod[r.method] ?? 0) - r.amount;
    total -= r.amount;
    count--;
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

/** عملکرد پلن‌ها در یک دوره: اشتراک‌های شروع‌شده در دوره به تفکیک پلن */
export function planBreakdown(
  subs: { planId: string; planName: string; price: number }[],
): { items: { planId: string; planName: string; count: number; revenue: number; sharePercent: number }[]; total: number } {
  const map = new Map<string, { planId: string; planName: string; count: number; revenue: number }>();
  for (const s of subs) {
    const cur = map.get(s.planId) ?? { planId: s.planId, planName: s.planName, count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += s.price;
    map.set(s.planId, cur);
  }
  const total = subs.length;
  const items = [...map.values()]
    .sort((a, b) => b.count - a.count)
    .map((x) => ({ ...x, sharePercent: total === 0 ? 0 : Math.round((x.count / total) * 100) }));
  return { items, total };
}

/** عملکرد کارکنان از لاگ ممیزی: تعداد تمدید و پرداخت ثبت‌شده به تفکیک کارمند */
export function staffPerformance(
  events: { actorId: string; action: string; meta: { price?: number; amount?: number } | null }[],
): { actorId: string; renewals: number; payments: number; collected: number }[] {
  const map = new Map<string, { actorId: string; renewals: number; payments: number; collected: number }>();
  for (const e of events) {
    const cur = map.get(e.actorId) ?? { actorId: e.actorId, renewals: 0, payments: 0, collected: 0 };
    if (e.action === 'subscription.create') {
      cur.renewals++;
      cur.collected += e.meta?.price ?? 0;
    } else if (e.action === 'payment.debt') {
      cur.payments++;
      cur.collected += e.meta?.amount ?? 0;
    } else {
      continue;
    }
    map.set(e.actorId, cur);
  }
  return [...map.values()].sort((a, b) => b.collected - a.collected);
}
