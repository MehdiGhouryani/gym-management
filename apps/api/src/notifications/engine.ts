/** موتور صف یادآوری — خالص و تست‌پذیر: تصمیم اینکه چه کسی امروز چه یادآوری‌ای لازم دارد */
import { subscriptionStatus } from '@fulad/shared';
import type { ReminderTemplate } from './templates';

export interface EngineMember {
  id: string;
  name: string;
  phone: string;
  currentEndsOn: string | null; // YYYY-MM-DD
  balance: number;
  smsOptOut: boolean;
}

/** آخرین تاریخ (YYYY-MM-DD) ارسال هر قالب برای هر عضو؛ کلید member:template */
export type LastReminderMap = Record<string, string | undefined>;

export interface PlanItem {
  memberId: string;
  template: ReminderTemplate;
}

const DEDUPE_DAYS = 3; // هر قالب حداکثر هر ۳ روز یک‌بار

/** آیا این قالب برای عضو در فاصله‌ی dedupe قبلاً ارسال شده؟ */
export function sentRecently(lastAt: string | undefined, today: string): boolean {
  if (!lastAt) return false;
  const diffMs = new Date(`${today}T00:00:00Z`).getTime() - new Date(`${lastAt}T00:00:00Z`).getTime();
  return diffMs < DEDUPE_DAYS * 86_400_000;
}

export function buildRemindersPlan(
  members: EngineMember[],
  opts: { today: string; expiringDays: number; graceDays: number; last: LastReminderMap },
): PlanItem[] {
  const plan: PlanItem[] = [];
  for (const m of members) {
    if (m.smsOptOut) continue;
    const items: ReminderTemplate[] = [];
    if (m.currentEndsOn) {
      const s = subscriptionStatus(m.currentEndsOn, opts.today, {
        expiringDays: opts.expiringDays,
        graceDays: opts.graceDays,
      });
      if (s.status === 'EXPIRING') items.push('expiring');
      if (s.status === 'EXPIRED' && s.followUp) items.push('expired');
    }
    if (m.balance > 0) items.push('debt');
    for (const template of items) {
      if (sentRecently(opts.last[`${m.id}:${template}`], opts.today)) continue;
      plan.push({ memberId: m.id, template });
    }
  }
  return plan;
}
