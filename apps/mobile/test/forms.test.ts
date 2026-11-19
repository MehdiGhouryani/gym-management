import { describe, it, expect } from 'vitest';
import { buildDebtPayment, validateMemberForm } from '../src/lib/forms.ts';

describe('فرم عضو', () => {
  it('معتبر و نرمال‌شده', () => {
    const r = validateMemberForm({ name: '  علي   رضايي ', phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹', note: '  ' });
    expect(r.ok).toBe(true);
    expect(r.name).toBe('علی رضایی');
    expect(r.phone).toBe('09123456789');
    expect(r.note).toBe(undefined);
  });
  it('پیش‌شماره‌ی بین‌المللی', () => {
    expect(validateMemberForm({ name: 'علی', phone: '+98 912 345 6789' }).phone).toBe('09123456789');
  });
  it('خطاها', () => {
    const r = validateMemberForm({ name: 'ع', phone: '0912' });
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBe('نام را وارد کنید (حداقل ۲ نویسه)');
    expect(r.errors.phone).toBe('شماره‌ی موبایل معتبر نیست');
  });
  it('یادداشت نگه داشته می‌شود', () => {
    expect(validateMemberForm({ name: 'علی', phone: '09123456789', note: ' الرژی ' }).note).toBe('الرژی');
  });
});

describe('پرداخت بدهی', () => {
  it('پیش‌فرض کل بدهی', () => {
    expect(buildDebtPayment({ balance: 1_200_000, amountText: null, method: 'CASH' })).toEqual({
      ok: true, error: null, amount: 1_200_000, remaining: 0, request: { amount: 1_200_000, method: 'CASH' },
    });
  });
  it('پرداخت بخشی', () => {
    const r = buildDebtPayment({ balance: 1_200_000, amountText: '۵۰۰٬۰۰۰', method: 'CARD' });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(700_000);
  });
  it('بیش از بدهی، صفر و نامعتبر', () => {
    expect(buildDebtPayment({ balance: 1000, amountText: '1001', method: 'POS' }).error).toBe('مبلغ از کل بدهی بیشتر است');
    expect(buildDebtPayment({ balance: 1000, amountText: '0', method: 'POS' }).error).toBe('مبلغ را وارد کنید');
    expect(buildDebtPayment({ balance: 1000, amountText: 'x', method: 'POS' }).error).toBe('مبلغ معتبر نیست');
  });
});
