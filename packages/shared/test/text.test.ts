import { describe, it, expect } from 'vitest';
import { normalizePersian } from '../src/text.ts';
import { parseMemberSearch } from '../src/search.ts';

describe('normalizePersian', () => {
  it('حروف عربی به فارسی', () => {
    expect(normalizePersian('علي كريمي')).toBe('علی کریمی');
  });
  it('فاصله‌ی اضافه و کشیده', () => {
    expect(normalizePersian('  علی    رضـایی ')).toBe('علی رضایی');
  });
  it('نیم‌فاصله حفظ می‌شود', () => {
    expect(normalizePersian('نيك‌خو')).toBe('نیک‌خو');
  });
  it('ارقام به لاتین', () => {
    expect(normalizePersian('سالن ۲')).toBe('سالن 2');
  });
});

describe('parseMemberSearch', () => {
  it('فقط رقم یعنی شماره‌ی موبایل', () => {
    expect(parseMemberSearch('۹۱۲۳')).toEqual({ phone: '9123' });
    expect(parseMemberSearch('0912 345')).toEqual({ phone: '0912345' });
    expect(parseMemberSearch('+98 912')).toEqual({ phone: '912' });
  });
  it('نام با یکسان‌سازی', () => {
    expect(parseMemberSearch('علي')).toEqual({ name: 'علی' });
  });
  it('نویسه‌های جایگزین LIKE حذف می‌شوند', () => {
    expect(parseMemberSearch('علی%_')).toEqual({ name: 'علی' });
    expect(parseMemberSearch('%')).toEqual({});
  });
  it('خالی', () => {
    expect(parseMemberSearch(undefined)).toEqual({});
    expect(parseMemberSearch('   ')).toEqual({});
  });
});
