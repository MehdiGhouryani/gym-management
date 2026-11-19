import { addDays, renewalDates } from './status';

export type RenewalPlan =
  | { ok: true; startsOn: string; endsOn: string }
  | { ok: false; reason: 'OVERLAP' | 'OUT_OF_RANGE' };

/** بیشترین فاصله‌ی تاریخ شروع دستی از امروز (روز) */
export const MAX_START_OFFSET_DAYS = 60;

/**
 * تاریخ‌های اشتراک جدید.
 * - بدون startsOn: اگر اشتراک فعلی معتبر است از روز بعد از پایان آن، وگرنه از امروز.
 * - با startsOn: نباید با اشتراک فعلی هم‌پوشانی داشته باشد و باید حداکثر ۶۰ روز از امروز فاصله داشته باشد.
 * endsOn آخرین روز معتبر است (شامل همان روز).
 */
export function planRenewal(a: {
  currentEndsOn: string | null;
  planDays: number;
  today: string;
  startsOn?: string;
}): RenewalPlan {
  if (a.startsOn === undefined) return { ok: true, ...renewalDates(a.currentEndsOn, a.planDays, a.today) };
  if (a.startsOn < addDays(a.today, -MAX_START_OFFSET_DAYS) || a.startsOn > addDays(a.today, MAX_START_OFFSET_DAYS)) {
    return { ok: false, reason: 'OUT_OF_RANGE' };
  }
  if (a.currentEndsOn !== null && a.startsOn <= a.currentEndsOn) return { ok: false, reason: 'OVERLAP' };
  return { ok: true, startsOn: a.startsOn, endsOn: addDays(a.startsOn, a.planDays - 1) };
}
