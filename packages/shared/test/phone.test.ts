import { describe, it, expect } from 'vitest';
import { normalizePhone, isIranMobile } from '../src/phone.ts';

describe('normalizePhone', () => {
  it('ارقام فارسی و فاصله', () => {
    expect(normalizePhone('۰۹۱۲ ۳۴۵ ۶۷۸۹')).toBe('09123456789');
  });
  it('پیش‌شماره‌ی بین‌المللی', () => {
    expect(normalizePhone('+98 912 345 6789')).toBe('09123456789');
    expect(normalizePhone('989123456789')).toBe('09123456789');
    expect(normalizePhone('0098 912 345 6789')).toBe('09123456789');
  });
  it('بدون صفر ابتدایی', () => {
    expect(normalizePhone('9123456789')).toBe('09123456789');
  });
  it('اعتبارسنجی', () => {
    expect(isIranMobile('09123456789')).toBe(true);
    expect(isIranMobile('0912345678')).toBe(false);
    expect(isIranMobile('02188001234')).toBe(false);
  });
});
