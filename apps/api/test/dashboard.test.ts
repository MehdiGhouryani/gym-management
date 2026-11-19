import { describe, it, expect } from 'vitest';
import { buildTrendRanges } from '../src/dashboard/dashboard-logic.ts';

describe('روند ۶ ماه داشبورد', () => {
  it('ماه جاری آخرین عنصر و ۶ ماه کامل می‌دهد', () => {
    const r = buildTrendRanges('2026-10-18', 6); // مهر ۱۴۰۵
    expect(r.length).toBe(6);
    expect(r[5].label).toBe('مهر');
    expect(r[4].label).toBe('شهریور');
    expect(r[0].label).toBe('اردیبهشت');
  });
  it('عبور از مرز سال درست است', () => {
    const r = buildTrendRanges('2026-03-05', 3); // اسفند ۱۴۰۴
    expect(r[2].label).toBe('اسفند');
    expect(r[1].label).toBe('بهمن');
    expect(r[0].label).toBe('دی');
  });
  it('بازه‌ی هر ماه با jalaliMonthRange هم‌خوان است', () => {
    const r = buildTrendRanges('2026-10-18', 1);
    expect(r[0].from).toBe('2026-09-23'); // ۱ مهر ۱۴۰۵
    expect(r[0].to).toBe('2026-10-22'); // ۳۰ مهر ۱۴۰۵
  });
});
