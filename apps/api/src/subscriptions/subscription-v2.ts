/** منطق خالص موتور اشتراک نسخه ۲: تخفیف درصدی، توقف موقت، لغو */

export const MAX_FREEZE_PER_ACTION = 30;
export const MAX_FREEZE_TOTAL = 30;

/** قیمت پس از تخفیف درصدی؛ درصد بین ۱ تا ۹۹ اعمال می‌شود و به عدد صحیح گرد می‌شود */
export function discountPrice(planPrice: number, percent: number): number {
  if (percent <= 0) return planPrice;
  const p = Math.min(99, percent);
  return Math.round((planPrice * (100 - p)) / 100);
}

export type FreezeRejection = 'RANGE' | 'PAST' | 'CANCELLED' | 'TOTAL';

/** اعتبارسنجی توقف موقت: ۱ تا ۳۰ روز در هر بار و حداکثر ۳۰ روز مجموع، فقط اشتراک آینده‌دار فعال */
export function freezeChecks(input: {
  days: number;
  frozenDays: number;
  endsOn: string; // YYYY-MM-DD
  today: string;
  cancelled: boolean;
}): { ok: true } | { ok: false; reason: FreezeRejection } {
  if (input.cancelled) return { ok: false, reason: 'CANCELLED' };
  if (input.days < 1 || input.days > MAX_FREEZE_PER_ACTION) return { ok: false, reason: 'RANGE' };
  if (input.frozenDays + input.days > MAX_FREEZE_TOTAL) return { ok: false, reason: 'TOTAL' };
  if (input.endsOn < input.today) return { ok: false, reason: 'PAST' };
  return { ok: true };
}

/** پایان اشتراک پس از لغو: اگر آینده بود، امروز؛ اگر گذشته، همان تاریخ */
export function cancelledEndsOn(endsOn: string, today: string): string {
  return endsOn > today ? today : endsOn;
}
