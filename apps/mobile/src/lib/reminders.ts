import { formatJalali } from './format';

export interface ReminderTarget {
  name: string;
  status: string;
  currentEndsOn: string | null;
}

/** پیام یادآوری دستی؛ ارسال خودکار با صف سرور در فاز ۳ می‌آید */
export function buildReminder(m: ReminderTarget, gymName: string): string {
  const first = m.name.trim().split(/\s+/)[0] ?? m.name;
  const date = m.currentEndsOn ? formatJalali(m.currentEndsOn) : '';
  const tail = 'برای تمدید با ما در تماس باشید.';
  if (m.status === 'EXPIRED') {
    return `سلام ${first} عزیز، اشتراک شما در باشگاه ${gymName} در ${date} تمام شده است. ${tail}`;
  }
  return `سلام ${first} عزیز، اشتراک شما در باشگاه ${gymName} در ${date} تمام می‌شود. ${tail}`;
}

export const toInternational = (phone: string): string => (phone.startsWith('0') ? `98${phone.slice(1)}` : phone);
export const telUrl = (phone: string): string => `tel:${phone}`;

/** iOS برای متن پیام از & و اندروید از ? استفاده می‌کند */
export function smsUrl(phone: string, body: string, os: 'ios' | 'android'): string {
  const enc = encodeURIComponent(body);
  return os === 'ios' ? `sms:${phone}&body=${enc}` : `sms:${phone}?body=${enc}`;
}
export const whatsappUrl = (phone: string, body: string): string =>
  `https://wa.me/${toInternational(phone)}?text=${encodeURIComponent(body)}`;
