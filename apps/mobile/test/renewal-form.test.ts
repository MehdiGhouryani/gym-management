import { describe, it, expect } from 'vitest';
import { buildRenewal } from '../src/lib/renewal-form.ts';
import type { PlanDto } from '../src/lib/api/types.ts';
import type { RenewFormInput } from '../src/lib/renewal-form.ts';

const TODAY = '2026-10-18';
const PLAN: PlanDto = { id: 'p3', name: 'سه‌ماهه', days: 90, price: 12_000_000, active: true, monthlyPrice: 4_000_000 };
const base = (over: Partial<RenewFormInput> = {}): RenewFormInput => ({
  member: { currentEndsOn: null, balance: 0 }, plan: PLAN, today: TODAY, isOwner: false,
  priceText: null, paidText: null, method: 'CARD', settleOldDebt: false, ...over,
});

describe('buildRenewal', () => {
  it('پیش‌فرض: پرداخت کامل، شروع از امروز', () => {
    const f = buildRenewal(base());
    expect(f.ok).toBe(true);
    expect(f.startsOn).toBe('2026-10-18');
    expect(f.endsOn).toBe('2027-01-15');
    expect(f.request).toEqual({ planId: 'p3', paidAmount: 12_000_000, method: 'CARD' });
    expect(f.totalToCollect).toBe(12_000_000);
    expect(f.debtAfter).toBe(0);
  });
  it('اشتراک معتبر: از روز بعد از پایان', () => {
    const f = buildRenewal(base({ member: { currentEndsOn: '2026-10-25', balance: 0 } }));
    expect(f.startsOn).toBe('2026-10-26');
  });
  it('پرداخت بخشی بدهی می‌سازد', () => {
    const f = buildRenewal(base({ paidText: '۱۰٬۸۰۰٬۰۰۰' }));
    expect(f.ok).toBe(true);
    expect(f.debtAfter).toBe(1_200_000);
    expect(f.request?.paidAmount).toBe(10_800_000);
  });
  it('بدون پرداخت: روش در درخواست نمی‌آید', () => {
    const f = buildRenewal(base({ paidText: '0' }));
    expect(f.ok).toBe(true);
    expect(f.request).toEqual({ planId: 'p3', paidAmount: 0 });
    expect(f.debtAfter).toBe(12_000_000);
  });
  it('پرداخت بیش از مبلغ رد می‌شود', () => {
    const f = buildRenewal(base({ paidText: '13000000' }));
    expect(f.ok).toBe(false);
    expect(f.error).toBe('مبلغ پرداختی از مبلغ اشتراک بیشتر است');
    expect(f.request).toBe(null);
  });
  it('پذیرش نمی‌تواند قیمت را تغییر دهد، مدیر می‌تواند', () => {
    const staff = buildRenewal(base({ priceText: '۱۰٬۰۰۰٬۰۰۰' }));
    expect(staff.price).toBe(12_000_000);
    expect(staff.request?.price).toBe(undefined);
    const owner = buildRenewal(base({ isOwner: true, priceText: '۱۰٬۰۰۰٬۰۰۰' }));
    expect(owner.price).toBe(10_000_000);
    expect(owner.request).toEqual({ planId: 'p3', paidAmount: 10_000_000, method: 'CARD', price: 10_000_000 });
  });
  it('تسویه‌ی بدهی قبلی در جمع دریافتی و بدهی بعدی', () => {
    const on = buildRenewal(base({ member: { currentEndsOn: null, balance: 1_200_000 }, settleOldDebt: true }));
    expect(on.oldDebtPayment).toBe(1_200_000);
    expect(on.totalToCollect).toBe(13_200_000);
    expect(on.debtAfter).toBe(0);
    const off = buildRenewal(base({ member: { currentEndsOn: null, balance: 1_200_000 } }));
    expect(off.oldDebtPayment).toBe(0);
    expect(off.debtAfter).toBe(1_200_000);
  });
  it('هم‌پوشانی تاریخ دستی', () => {
    const f = buildRenewal(base({ member: { currentEndsOn: '2026-10-25', balance: 0 }, startsOn: '2026-10-20' }));
    expect(f.ok).toBe(false);
    expect(f.error).toBe('تاریخ شروع با اشتراک فعلی هم‌پوشانی دارد');
  });
  it('تاریخ دستی معتبر در درخواست می‌آید', () => {
    const f = buildRenewal(base({ startsOn: '2026-10-20' }));
    expect(f.request?.startsOn).toBe('2026-10-20');
    expect(f.endsOn).toBe('2027-01-17');
  });
  it('بدون پلن و مبلغ نامعتبر', () => {
    expect(buildRenewal(base({ plan: null })).error).toBe('پلن را انتخاب کنید');
    expect(buildRenewal(base({ paidText: 'abc' })).error).toBe('مبلغ پرداختی معتبر نیست');
    expect(buildRenewal(base({ isOwner: true, priceText: '' })).error).toBe('مبلغ اشتراک معتبر نیست');
  });
});
