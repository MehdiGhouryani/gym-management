import { describe, it, expect } from 'vitest';
import { compactToman, faDigits, formatJalali, formatPhone, formatToman, initialOf, platesFilled, statusInfo } from '../src/lib/format.ts';

describe('اعداد و مبلغ', () => {
  it('ارقام فارسی', () => {
    expect(faDigits('2026-10')).toBe('۲۰۲۶-۱۰');
  });
  it('تومان با جداکننده', () => {
    expect(formatToman(13_200_000)).toBe('۱۳٬۲۰۰٬۰۰۰ تومان');
    expect(formatToman(0, false)).toBe('۰');
    expect(formatToman(-1500)).toBe('−۱٬۵۰۰ تومان');
    expect(formatToman(999)).toBe('۹۹۹ تومان');
  });
  it('مبلغ کوتاه', () => {
    expect(compactToman(48_500_000)).toBe('۴۸٫۵ میلیون');
    expect(compactToman(12_000_000)).toBe('۱۲ میلیون');
    expect(compactToman(1_200_000)).toBe('۱٫۲ میلیون');
    expect(compactToman(3_666_667)).toBe('۳٫۷ میلیون');
    expect(compactToman(450_000)).toBe('۴۵۰ هزار');
    expect(compactToman(999_999)).toBe('۱ میلیون');
    expect(compactToman(800)).toBe('۸۰۰');
  });
});

describe('تاریخ و شماره', () => {
  it('تاریخ شمسی', () => {
    expect(formatJalali('2026-10-12')).toBe('۲۰ مهر');
    expect(formatJalali('2026-10-12', true)).toBe('۲۰ مهر ۱۴۰۵');
    expect(formatJalali('2026-03-21')).toBe('۱ فروردین');
  });
  it('شماره‌ی موبایل با جداکننده و ایزوله‌ی چپ‌به‌راست', () => {
    expect(formatPhone('09123456789')).toBe('\u2066۰۹۱۲ ۳۴۵ ۶۷۸۹\u2069');
  });
  it('حرف اول نام', () => {
    expect(initialOf('نگار احمدی')).toBe('ن');
    expect(initialOf('  ')).toBe('؟');
  });
});

describe('وضعیت', () => {
  it('برچسب و رنگ', () => {
    expect(statusInfo({ status: 'ACTIVE', daysLeft: 12 })).toEqual({ label: '۱۲ روز مانده', tone: 'ok' });
    expect(statusInfo({ status: 'EXPIRING', daysLeft: 3 })).toEqual({ label: '۳ روز مانده', tone: 'warn' });
    expect(statusInfo({ status: 'EXPIRING', daysLeft: 0 })).toEqual({ label: 'امروز آخرین روز', tone: 'warn' });
    expect(statusInfo({ status: 'EXPIRED', daysLeft: -2 })).toEqual({ label: '۲ روز گذشته', tone: 'bad' });
    expect(statusInfo({ status: 'NONE', daysLeft: null })).toEqual({ label: 'بدون اشتراک', tone: 'none' });
  });
  it('میله‌ی ۳۰ روزه', () => {
    expect(platesFilled(18)).toBe(18);
    expect(platesFilled(45)).toBe(30);
    expect(platesFilled(-3)).toBe(0);
    expect(platesFilled(null)).toBe(0);
  });
});
