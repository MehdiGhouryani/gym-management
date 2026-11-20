/** منطق خالص حضور و غیاب */

/** پنجره‌ی جلوگیری از ورود تکراری: ساعت‌ها */
export const DUPLICATE_WINDOW_HOURS = 4;

export function isWithinDuplicateWindow(checkInAt: string, now: string, windowHours: number = DUPLICATE_WINDOW_HOURS): boolean {
  const diffMs = new Date(now).getTime() - new Date(checkInAt).getTime();
  return diffMs >= 0 && diffMs < windowHours * 3_600_000;
}

/** بررسی اجازه‌ی ورود: اشتراک معتبر امروز یا جلسه‌ی باقی‌مانده */
export type CheckInRejection = 'NO_SUBSCRIPTION' | 'SUBSCRIPTION_ENDED' | 'NO_SESSIONS';

export function checkInPermission(input: {
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
  planKind: 'days' | 'sessions';
  sessionsRemaining: number | null;
}): { ok: true } | { ok: false; reason: CheckInRejection } {
  if (input.status === 'NONE') return { ok: false, reason: 'NO_SUBSCRIPTION' };
  if (input.status === 'EXPIRED') return { ok: false, reason: 'SUBSCRIPTION_ENDED' };
  if (input.planKind === 'sessions' && input.sessionsRemaining !== null && input.sessionsRemaining <= 0) {
    return { ok: false, reason: 'NO_SESSIONS' };
  }
  return { ok: true };
}

/** تعداد مراجعات در هر ساعت تهران (۰ تا ۲۳) برای گزارش ساعت‌های شلوغ */
export function hoursHistogram(checkInDates: Date[]): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  for (const d of checkInDates) {
    out[new Date(d).getHours()]++;
  }
  return out;
}
