/**
 * تعریف واحد شاخص‌ها (منبع حقیقت KPI) — همه‌ی صفحات و گزارش‌ها از همین قواعد استفاده می‌کنند
 * تا اعداد داشبورد و گزارش‌ها هرگز تناقض نداشته باشند.
 */
import { todayInTehran } from './status';

/** عضو فعال: بایگانی‌نشده که اشتراکش امروز معتبر است (currentEndsOn >= امروز تهران) */
export const KPI_ACTIVE_MEMBER = 'archivedAt == null && currentEndsOn >= todayInTehran()';

/** درآمد دوره: پرداخت‌های دریافت‌شده در دوره (به وقت تهران) منهای بازپرداخت‌های همان دوره */
export const KPI_REVENUE = 'sum(payments.paidAt in period) - sum(refunds.refundedAt in period)';

/** مطالبات: جمع balance همه‌ی اعضای بایگانی‌نشده در لحظه‌ی درخواست */
export const KPI_RECEIVABLES = 'sum(member.balance where archivedAt == null)';

/** عضو جدید ماه: createdAt در بازه‌ی ماه شمسی به وقت تهران */
export const KPI_NEW_MEMBER = 'createdAt in jalaliMonthRange(year, month)';

/** نرخ تمدید: درصد اشتراک‌های تمام‌شده‌ی ماه که تا graceDays بعد اشتراک گرفتند؛ pending ها حساب نمی‌شوند */
export const KPI_RENEWAL_RATE = 'renewed / (renewed + lost) where renewal started in (endsOn, endsOn + graceDays]';

/** چرخه‌ی سرنخ */
export const KPI_LEAD_FUNNEL = 'NEW → CONTACTED → TRIAL → CONVERTED/LOST';

/** درآمد خالص یک دوره از ردیف‌ها (پرداخت منهای بازپرداخت)؛ تاریخ به وقت تهران */
export function netRevenue(
  payments: { amount: number; paidAt: Date | string }[],
  refunds: { amount: number; refundedAt: Date | string }[],
  inRange: (isoDate: string) => boolean,
): number {
  let total = 0;
  for (const p of payments) {
    if (inRange(typeof p.paidAt === 'string' ? p.paidAt.slice(0, 10) : todayInTehran(p.paidAt))) total += p.amount;
  }
  for (const r of refunds) {
    if (inRange(typeof r.refundedAt === 'string' ? r.refundedAt.slice(0, 10) : todayInTehran(r.refundedAt))) total -= r.amount;
  }
  return total;
}
