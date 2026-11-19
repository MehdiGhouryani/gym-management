import { describe, it, expect } from 'vitest';
import { fromDateOnly, isPlausibleBirthDate, toDateOnly } from '../src/common/dates.ts';
import { endsOnWhere } from '../src/members/member-query.ts';
import { toMemberDto } from '../src/members/members.mapper.ts';
import { planMonthly, toPlanDto } from '../src/plans/plan.mapper.ts';

const TODAY = '2026-10-18';
const row = (over: Record<string, unknown> = {}) => ({
  id: 'm1', name: 'نگار احمدی', phone: '09123456789', birthDate: null, note: null,
  currentEndsOn: null, balance: 0, archivedAt: null, createdAt: new Date('2026-01-01T00:00:00Z'), ...over,
});

describe('تاریخ', () => {
  it('رفت‌وبرگشت', () => {
    expect(toDateOnly(fromDateOnly('2026-10-18'))).toBe('2026-10-18');
  });
  it('تاریخ تولد معقول', () => {
    expect(isPlausibleBirthDate('1990-05-20', TODAY)).toBe(true);
    expect(isPlausibleBirthDate('1899-12-31', TODAY)).toBe(false);
    expect(isPlausibleBirthDate('2026-10-19', TODAY)).toBe(false);
  });
});

describe('toMemberDto', () => {
  it('نزدیک انقضا', () => {
    const d = toMemberDto(row({ currentEndsOn: fromDateOnly('2026-10-21') }), TODAY, {});
    expect(d.status).toBe('EXPIRING');
    expect(d.daysLeft).toBe(3);
    expect(d.currentEndsOn).toBe('2026-10-21');
  });
  it('بدهی در خروجی می‌آید', () => {
    expect(toMemberDto(row({ balance: 1_200_000 }), TODAY, {}).balance).toBe(1_200_000);
  });
  it('بدون اشتراک', () => {
    const d = toMemberDto(row(), TODAY, {});
    expect(d.status).toBe('NONE');
    expect(d.daysLeft).toBe(null);
  });
  it('منقضی در مهلت پیگیری', () => {
    const d = toMemberDto(row({ currentEndsOn: fromDateOnly('2026-10-16') }), TODAY, {});
    expect(d.status).toBe('EXPIRED');
    expect(d.followUp).toBe(true);
  });
  it('آستانه‌های باشگاه اعمال می‌شود', () => {
    const d = toMemberDto(row({ currentEndsOn: fromDateOnly('2026-10-21') }), TODAY, { expiringDays: 2 });
    expect(d.status).toBe('ACTIVE');
  });
  it('تاریخ‌ها رشته‌اند', () => {
    const d = toMemberDto(row({ birthDate: fromDateOnly('1990-05-20'), archivedAt: new Date('2026-10-01T10:00:00Z') }), TODAY, {});
    expect(d.birthDate).toBe('1990-05-20');
    expect(d.archivedAt).toBe('2026-10-01T10:00:00.000Z');
  });
});

describe('endsOnWhere', () => {
  it('نزدیک انقضا', () => {
    expect(endsOnWhere('expiring', TODAY, {})).toEqual({
      currentEndsOn: { gte: fromDateOnly('2026-10-18'), lte: fromDateOnly('2026-10-25') },
    });
  });
  it('بدون اشتراک', () => {
    expect(endsOnWhere('none', TODAY, {})).toEqual({ currentEndsOn: null });
  });
  it('مهلت سفارشی', () => {
    expect(endsOnWhere('expired', TODAY, { graceDays: 5 })).toEqual({
      currentEndsOn: { lt: fromDateOnly('2026-10-18'), gte: fromDateOnly('2026-10-13') },
    });
  });
});

describe('پلن', () => {
  it('معادل ماهانه', () => {
    expect(planMonthly(12_000_000, 90)).toBe(4_000_000);
    expect(planMonthly(4_500_000, 30)).toBe(4_500_000);
    expect(planMonthly(22_000_000, 180)).toBe(3_666_667);
  });
  it('dto', () => {
    expect(toPlanDto({ id: 'p', name: 'سه‌ماهه', days: 90, price: 12_000_000, active: true })).toEqual({
      id: 'p', name: 'سه‌ماهه', days: 90, price: 12_000_000, active: true, monthlyPrice: 4_000_000,
    });
  });
});
