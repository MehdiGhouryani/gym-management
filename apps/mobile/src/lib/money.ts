import { normalizeDigits } from '@fulad/shared';
import { formatToman } from './format';

const MAX_TOMAN = 2_000_000_000;

/** متن وارد‌شده‌ی کاربر (ارقام فارسی، جداکننده، فاصله) را به تومانِ صحیح تبدیل می‌کند؛ نامعتبر = null */
export function parseToman(text: string): number | null {
  const t = normalizeDigits(text).replace(/[٬,،\s]/g, '');
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n <= MAX_TOMAN ? n : null;
}

/** هنگام تایپ، مبلغ را با جداکننده‌ی هزارگان فارسی نشان می‌دهد */
export function formatMoneyInput(text: string): string {
  const digits = normalizeDigits(text).replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  const n = Number(digits);
  return n > MAX_TOMAN ? formatToman(MAX_TOMAN, false) : formatToman(n, false);
}
