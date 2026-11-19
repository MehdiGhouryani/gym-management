/** قالب‌بندی فارسی برای وب — ارقام، تومان و تاریخ شمسی */

export const faNum = (n: number): string => n.toLocaleString('fa-IR');

/** مبلغ به تومان با جداکننده‌ی هزارگان فارسی */
export const faToman = (n: number): string => `${n.toLocaleString('fa-IR')} تومان`;

/** تاریخ ISO به شمسی فارسی */
export const faDate = (iso: string): string =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));

/** برچسب روش پرداخت */
export const methodLabel: Record<string, string> = { CASH: 'نقدی', CARD: 'کارت', POS: 'کارت‌خوان' };

/** برچسب وضعیت عضو با رنگ نشان */
export const statusBadge: Record<string, { label: string; kind: 'ok' | 'wn' | 'bad' | 'debt' | 'neutral' }> = {
  ACTIVE: { label: 'فعال', kind: 'ok' },
  EXPIRING: { label: 'نزدیک انقضا', kind: 'wn' },
  EXPIRED: { label: 'منقضی', kind: 'bad' },
  NONE: { label: 'بدون اشتراک', kind: 'neutral' },
};
