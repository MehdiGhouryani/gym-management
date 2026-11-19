// منطق وضعیت اشتراک؛ تنها منبع حقیقت برای سرور، وب و اپ.
// قرارداد: endsOn آخرین روزِ معتبر است (شامل همان روز). تاریخ‌ها به‌صورت YYYY-MM-DD (میلادی) ذخیره می‌شوند.

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';

export interface StatusOptions {
  /** تا چند روز مانده «نزدیک انقضا» حساب شود (پیش‌فرض ۷) */
  expiringDays?: number;
  /** تا چند روز بعد از پایان، عضو در فهرست پیگیری بماند (پیش‌فرض ۱۴) */
  graceDays?: number;
}

export interface StatusResult {
  status: SubscriptionStatus;
  /** روز مانده تا endsOn؛ صفر یعنی امروز آخرین روز است؛ منفی یعنی گذشته */
  daysLeft: number | null;
  /** عضو منقضی هنوز در مهلت پیگیری است */
  followUp: boolean;
}

const DAY_MS = 86_400_000;

export function toDayNumber(value: string | Date): number {
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) throw new Error(`Invalid date: ${value}`);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
  }
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / DAY_MS;
}

export function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

const TEHRAN_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** تاریخ (YYYY-MM-DD) یک لحظه به وقت تهران؛ بدون ورودی یعنی امروز. از formatToParts استفاده می‌کند تا به قالب‌بندی زبان دستگاه وابسته نباشد (Hermes). */
export function todayInTehran(now: Date = new Date()): string {
  let y = '';
  let m = '';
  let d = '';
  for (const p of TEHRAN_DATE.formatToParts(now)) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
}

export function subscriptionStatus(
  endsOn: string | Date | null | undefined,
  today: string | Date = todayInTehran(),
  opts: StatusOptions = {},
): StatusResult {
  const { expiringDays = 7, graceDays = 14 } = opts;
  if (endsOn == null) return { status: 'NONE', daysLeft: null, followUp: false };
  const daysLeft = toDayNumber(endsOn) - toDayNumber(today);
  if (daysLeft < 0) return { status: 'EXPIRED', daysLeft, followUp: -daysLeft <= graceDays };
  return { status: daysLeft <= expiringDays ? 'EXPIRING' : 'ACTIVE', daysLeft, followUp: false };
}

/** تاریخ شروع و پایان تمدید: اگر اشتراک معتبر است از روز بعد از پایان فعلی، وگرنه از امروز */
export function renewalDates(
  currentEndsOn: string | Date | null | undefined,
  planDays: number,
  today: string | Date = todayInTehran(),
): { startsOn: string; endsOn: string } {
  const t = toDayNumber(today);
  const cur = currentEndsOn == null ? null : toDayNumber(currentEndsOn);
  const start = cur !== null && cur >= t ? cur + 1 : t;
  return { startsOn: fromDayNumber(start), endsOn: fromDayNumber(start + planDays - 1) };
}

export function addDays(date: string, n: number): string {
  return fromDayNumber(toDayNumber(date) + n);
}

/** YYYY-MM-DD و تاریخ واقعی تقویم (مثلاً ۳۱ شهریور یا ۳۰ فوریه رد می‌شود) */
export function isValidDateOnly(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

export type StatusFilter = 'active' | 'expiring' | 'expired' | 'lapsed' | 'none';
export type EndsOnRange = { isNull: true } | { gt?: string; gte?: string; lt?: string; lte?: string };

/**
 * بازه‌ی endsOn برای هر فیلتر وضعیت؛ دقیقاً با subscriptionStatus هم‌خوان است.
 * expired = منقضی و هنوز در مهلت پیگیری؛ lapsed = منقضی و خارج از مهلت.
 */
export function statusFilterRange(
  filter: StatusFilter,
  today: string = todayInTehran(),
  opts: StatusOptions = {},
): EndsOnRange {
  const { expiringDays = 7, graceDays = 14 } = opts;
  switch (filter) {
    case 'active':
      return { gt: addDays(today, expiringDays) };
    case 'expiring':
      return { gte: today, lte: addDays(today, expiringDays) };
    case 'expired':
      return { lt: today, gte: addDays(today, -graceDays) };
    case 'lapsed':
      return { lt: addDays(today, -graceDays) };
    case 'none':
      return { isNull: true };
  }
}

/**
 * لحظه‌ی شروع روز تهران (۰۰:۰۰) به‌صورت Date (UTC).
 * فرض: UTC+3:30 ثابت است (ایران از ۱۴۰۱ ساعت تابستانی ندارد؛ داده‌ی این سامانه از ۱۴۰۵ شروع می‌شود).
 */
export function tehranDayStart(date: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 3.5 * 3600 * 1000);
}
