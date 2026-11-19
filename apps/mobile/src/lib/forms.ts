import { isIranMobile, normalizePersian, normalizePhone } from '@fulad/shared';
import type { MemberDto, PayBody, PayMethod, UpdateMemberBody } from './api/types';
import { parseToman } from './money';

export function validateMemberForm(i: { name: string; phone: string; note?: string }) {
  const name = normalizePersian(i.name);
  const phone = normalizePhone(i.phone);
  const errors: { name?: string; phone?: string } = {};
  if (name.length < 2 || name.length > 80) errors.name = 'نام را وارد کنید (حداقل ۲ نویسه)';
  if (!isIranMobile(phone)) errors.phone = 'شماره‌ی موبایل معتبر نیست';
  const note = (i.note ?? '').trim();
  return { ok: !errors.name && !errors.phone, name, phone, note: note || undefined, errors };
}

/** پرداخت بدهی: پیش‌فرض کل بدهی؛ بیش از بدهی مجاز نیست */
export function buildDebtPayment(i: { balance: number; amountText: string | null; method: PayMethod }) {
  const amount = i.amountText === null ? i.balance : parseToman(i.amountText);
  const fail = (error: string) => ({ ok: false as const, error, amount: amount ?? 0, remaining: i.balance, request: null });
  if (amount === null) return fail('مبلغ معتبر نیست');
  if (amount < 1) return fail('مبلغ را وارد کنید');
  if (amount > i.balance) return fail('مبلغ از کل بدهی بیشتر است');
  const request: PayBody = { amount, method: i.method };
  return { ok: true as const, error: null, amount, remaining: i.balance - amount, request };
}

/** فقط فیلدهای تغییرکرده فرستاده می‌شوند؛ یادداشت خالی یعنی پاک‌کردن */
export function buildMemberUpdate(
  orig: Pick<MemberDto, 'name' | 'phone' | 'note'>,
  i: { name: string; phone: string; note: string },
) {
  const v = validateMemberForm(i);
  if (!v.ok) return { ok: false as const, errors: v.errors, body: null, changed: false };
  const body: UpdateMemberBody = {};
  if (v.name !== orig.name) body.name = v.name;
  if (v.phone !== orig.phone) body.phone = v.phone;
  const note = v.note ?? null;
  if (note !== (orig.note ?? null)) body.note = note;
  const changed = Object.keys(body).length > 0;
  return { ok: true as const, errors: {}, body: changed ? body : null, changed };
}
