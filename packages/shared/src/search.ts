import { normalizePersian } from './text';

/** جستجوی عضو: فقط رقم یعنی شماره‌ی موبایل (بخشی از شماره)؛ غیر از آن نام */
export function parseMemberSearch(q?: string): { name?: string; phone?: string } {
  if (!q) return {};
  const t = normalizePersian(q);
  if (!t) return {};
  if (/^[\d\s+-]+$/.test(t)) {
    const digits = t.replace(/\D/g, '');
    const phone = t.startsWith('+98') ? digits.slice(2) : digits;
    return phone ? { phone } : {};
  }
  // نویسه‌های جایگزین LIKE حذف می‌شوند تا جستجو چیز دیگری را نخواند
  const name = t.replace(/[%_\\]/g, '').trim();
  return name ? { name } : {};
}
