import { describe, it, expect } from 'vitest';
import { parseJalaliDate, toJalaliString } from '../src/lib/jalali-input';

describe('parseJalaliDate', () => {
  it('تاریخ معتبر با ارقام فارسی', () => {
    expect(parseJalaliDate('۱۴۰۵/۰۷/۱۲')).toBe('2026-10-04');
  });
  it('کوتاه با خط تیره', () => {
    expect(parseJalaliDate('1405-7-1')).toBe('2026-09-23');
  });
  it('خالی و بی‌شکل: null', () => {
    expect(parseJalaliDate('')).toBeNull();
    expect(parseJalaliDate('1405/13/01')).toBeNull();
    expect(parseJalaliDate('1405/07/32')).toBeNull();
    expect(parseJalaliDate('2026/10/04')).toBeNull();
  });
  it('روز آخر ماه ۶تایی', () => {
    expect(parseJalaliDate('1405/06/31')).toBe('2026-09-22');
    expect(parseJalaliDate('1405/06/32')).toBeNull();
  });
});

describe('toJalaliString', () => {
  it('ISO به شمسی', () => {
    expect(toJalaliString('2026-09-23')).toBe('1405/07/01');
  });
});
