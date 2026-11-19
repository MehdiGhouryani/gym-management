const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (c) => String(FA.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String(AR.indexOf(c)));
}

/** هر قالب رایج شماره‌ی موبایل ایران را به 09xxxxxxxxx تبدیل می‌کند */
export function normalizePhone(input: string): string {
  let d = normalizeDigits(input).replace(/[^\d+]/g, '');
  if (d.startsWith('+98')) d = '0' + d.slice(3);
  else if (d.startsWith('0098')) d = '0' + d.slice(4);
  else if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2);
  else if (d.length === 10 && d.startsWith('9')) d = '0' + d;
  return d;
}

export const isIranMobile = (phone: string): boolean => /^09\d{9}$/.test(phone);
