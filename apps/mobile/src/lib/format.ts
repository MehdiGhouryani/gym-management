import { JALALI_MONTHS, gregorianToJalali } from '@fulad/shared';

const FA = '۰۱۲۳۴۵۶۷۸۹';
export const faDigits = (v: number | string): string => String(v).replace(/\d/g, (d) => FA.charAt(Number(d)));

/** ۱۳٬۲۰۰٬۰۰۰ تومان */
export function formatToman(n: number, withUnit = true): string {
  const grouped = Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${n < 0 ? '−' : ''}${faDigits(grouped)}${withUnit ? ' تومان' : ''}`;
}

/** ۴۸٫۵ میلیون، ۴۵۰ هزار */
export function compactToman(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 999_500) return `${faDigits(String(Math.round(abs / 100_000) / 10).replace('.', '٫'))} میلیون`;
  if (abs >= 1000) return `${faDigits(Math.round(abs / 1000))} هزار`;
  return faDigits(abs);
}

/** ۲۰ مهر یا ۲۰ مهر ۱۴۰۵ */
export function formatJalali(date: string, withYear = false): string {
  const { jy, jm, jd } = gregorianToJalali(date);
  return `${faDigits(jd)} ${JALALI_MONTHS[jm - 1]}${withYear ? ` ${faDigits(jy)}` : ''}`;
}

/** اعداد در متن راست‌چین جابه‌جا نشوند (ترتیب گروه‌های شماره) */
export const ltr = (s: string): string => `\u2066${s}\u2069`;

export function formatPhone(phone: string): string {
  const p = phone.length === 11 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
  return ltr(faDigits(p));
}

export const initialOf = (name: string): string => Array.from(name.trim())[0] ?? '؟';

export type Tone = 'ok' | 'warn' | 'bad' | 'none';

export function statusInfo(m: { status: string; daysLeft: number | null }): { label: string; tone: Tone } {
  const d = m.daysLeft ?? 0;
  switch (m.status) {
    case 'ACTIVE':
      return { label: `${faDigits(d)} روز مانده`, tone: 'ok' };
    case 'EXPIRING':
      return { label: d === 0 ? 'امروز آخرین روز' : `${faDigits(d)} روز مانده`, tone: 'warn' };
    case 'EXPIRED':
      return { label: `${faDigits(-d)} روز گذشته`, tone: 'bad' };
    default:
      return { label: 'بدون اشتراک', tone: 'none' };
  }
}

/** تعداد تکه‌های پرشده‌ی میله‌ی ۳۰ روزه */
export const platesFilled = (daysLeft: number | null): number => Math.min(Math.max(daysLeft ?? 0, 0), 30);

export const METHOD_LABELS = { CASH: 'نقدی', CARD: 'کارت‌به‌کارت', POS: 'پوز' } as const;
