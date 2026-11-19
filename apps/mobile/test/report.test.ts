import { describe, it, expect } from 'vitest';
import { canGoNext, canGoPrev, changeLabel, currentMonth, millionsOnly, monthTitle, renewalSummary, shiftMonth, weekBars } from '../src/lib/report.ts';
import { buildMemberUpdate } from '../src/lib/forms.ts';

describe('ماه گزارش', () => {
  it('ماه جاری از تاریخ امروز', () => {
    expect(currentMonth('2026-10-12')).toEqual({ year: 1405, month: 7 });
    expect(currentMonth('2026-03-21')).toEqual({ year: 1405, month: 1 });
  });
  it('جابه‌جایی از مرز سال', () => {
    expect(shiftMonth({ year: 1405, month: 1 }, -1)).toEqual({ year: 1404, month: 12 });
    expect(shiftMonth({ year: 1404, month: 12 }, 1)).toEqual({ year: 1405, month: 1 });
    expect(shiftMonth({ year: 1405, month: 7 }, 1)).toEqual({ year: 1405, month: 8 });
  });
  it('ماه آینده و کمترین ماه', () => {
    expect(canGoNext({ year: 1405, month: 7 }, '2026-10-12')).toBe(false);
    expect(canGoNext({ year: 1405, month: 6 }, '2026-10-12')).toBe(true);
    expect(canGoNext({ year: 1404, month: 12 }, '2026-10-12')).toBe(true);
    expect(canGoPrev({ year: 1302, month: 1 })).toBe(false);
    expect(canGoPrev({ year: 1302, month: 2 })).toBe(true);
    expect(canGoPrev({ year: 1405, month: 1 })).toBe(true);
  });
  it('عنوان', () => {
    expect(monthTitle({ year: 1405, month: 7 })).toBe('مهر ۱۴۰۵');
  });
});

describe('نمودار و برچسب‌ها', () => {
  it('میلیون', () => {
    expect(millionsOnly(11_200_000)).toBe('۱۱٫۲');
    expect(millionsOnly(14_600_000)).toBe('۱۴٫۶');
    expect(millionsOnly(0)).toBe('۰');
  });
  it('ستون‌ها: بیشترین یک است و مقدار کوچک دیده می‌شود', () => {
    const b = weekBars([5_000_000, 10_000_000, 0, 100_000]);
    expect(b.map((x) => x.ratio)).toEqual([0.5, 1, 0, 0.04]);
    expect(b[0]?.label).toBe('هفته ۱');
  });
  it('همه صفر', () => {
    expect(weekBars([0, 0, 0, 0]).every((x) => x.ratio === 0)).toBe(true);
  });
  it('تغییر نسبت به ماه قبل', () => {
    expect(changeLabel(8)).toEqual({ text: '+۸٪ نسبت به ماه قبل', tone: 'up' });
    expect(changeLabel(-3)).toEqual({ text: '−۳٪ نسبت به ماه قبل', tone: 'down' });
    expect(changeLabel(0).tone).toBe('flat');
    expect(changeLabel(null).tone).toBe('none');
  });
  it('نرخ تمدید', () => {
    expect(renewalSummary({ total: 25, renewed: 18, lost: 4, pending: 3, rate: 82 })).toEqual({
      value: '۸۲٪', detail: '۱۸ تمدید، ۴ ازدست‌رفته، ۳ در انتظار',
    });
    expect(renewalSummary({ total: 2, renewed: 0, lost: 0, pending: 2, rate: null }).value).toBe('هنوز مشخص نیست');
    expect(renewalSummary({ total: 0, renewed: 0, lost: 0, pending: 0, rate: null }).detail).toBe('اشتراکی در این ماه تمام نمی‌شود');
  });
});

describe('ویرایش عضو', () => {
  const orig = { name: 'نگار احمدی', phone: '09123456789', note: null as string | null };
  it('بدون تغییر: چیزی فرستاده نمی‌شود', () => {
    const r = buildMemberUpdate(orig, { name: ' نگار  احمدی ', phone: '۰۹۱۲۳۴۵۶۷۸۹', note: '' });
    expect(r.ok).toBe(true);
    expect(r.changed).toBe(false);
    expect(r.body).toBe(null);
  });
  it('فقط فیلدهای تغییرکرده', () => {
    const r = buildMemberUpdate(orig, { name: 'نگار احمدی‌نژاد', phone: '09123456789', note: 'الرژی' });
    expect(r.body).toEqual({ name: 'نگار احمدی‌نژاد', note: 'الرژی' });
  });
  it('شماره‌ی جدید نرمال می‌شود', () => {
    expect(buildMemberUpdate(orig, { name: 'نگار احمدی', phone: '+98 912 000 1111', note: '' }).body).toEqual({ phone: '09120001111' });
  });
  it('پاک‌کردن یادداشت', () => {
    expect(buildMemberUpdate({ ...orig, note: 'قدیمی' }, { name: 'نگار احمدی', phone: '09123456789', note: '  ' }).body).toEqual({ note: null });
  });
  it('نامعتبر', () => {
    const r = buildMemberUpdate(orig, { name: 'ن', phone: '12', note: '' });
    expect(r.ok).toBe(false);
    expect(r.body).toBe(null);
  });
});
