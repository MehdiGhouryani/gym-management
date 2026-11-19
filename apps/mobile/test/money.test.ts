import { describe, it, expect } from 'vitest';
import { formatMoneyInput, parseToman } from '../src/lib/money.ts';

describe('parseToman', () => {
  it('ارقام فارسی و جداکننده‌ها', () => {
    expect(parseToman('۱۲٬۰۰۰٬۰۰۰')).toBe(12_000_000);
    expect(parseToman('12,000,000')).toBe(12_000_000);
    expect(parseToman(' ۴ ۵۰۰ ۰۰۰ ')).toBe(4_500_000);
    expect(parseToman('٣٠٠')).toBe(300);
    expect(parseToman('0')).toBe(0);
  });
  it('نامعتبر', () => {
    expect(parseToman('')).toBe(null);
    expect(parseToman('12a')).toBe(null);
    expect(parseToman('-5')).toBe(null);
    expect(parseToman('1.5')).toBe(null);
    expect(parseToman('2000000001')).toBe(null);
    expect(parseToman('2000000000')).toBe(2_000_000_000);
  });
});

describe('formatMoneyInput', () => {
  it('جداکننده هنگام تایپ', () => {
    expect(formatMoneyInput('')).toBe('');
    expect(formatMoneyInput('1200')).toBe('۱٬۲۰۰');
    expect(formatMoneyInput('۱٬۲۰۰۰')).toBe('۱۲٬۰۰۰');
    expect(formatMoneyInput('abc')).toBe('');
    expect(formatMoneyInput('99999999999')).toBe('۲٬۰۰۰٬۰۰۰٬۰۰۰');
  });
});
