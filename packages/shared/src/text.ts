import { normalizeDigits } from './phone';

/**
 * یکسان‌سازی متن فارسی برای ذخیره و جستجو: حروف عربی (ي ك ى) به فارسی، حذف کشیده و نویسه‌های نامرئی
 * (به‌جز نیم‌فاصله)، ارقام به لاتین و فاصله‌های اضافه.
 */
export function normalizePersian(input: string): string {
  return normalizeDigits(input.normalize('NFC'))
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/\u0640/g, '')
    .replace(/[\u200B\u200E\u200F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
