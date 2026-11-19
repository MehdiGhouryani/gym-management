import { describe, it, expect } from 'vitest';
import { decideOtpRequest, generateOtpCode, hashOtp, verifyOtpHash } from '../src/auth/otp.ts';

const NOW = new Date('2026-10-20T10:00:00Z');
const ago = (sec: number) => new Date(NOW.getTime() - sec * 1000);

describe('OTP', () => {
  it('کد ۵ رقمی (با صفر ابتدایی مجاز)', () => {
    for (let i = 0; i < 300; i++) expect(/^\d{5}$/.test(generateOtpCode())).toBe(true);
  });
  it('هش وابسته به شماره و pepper است', () => {
    const h = hashOtp('12345', '09123456789', 'pepper-pepper-pepper');
    expect(hashOtp('12345', '09123456789', 'pepper-pepper-pepper')).toBe(h);
    expect(hashOtp('12345', '09123456788', 'pepper-pepper-pepper') === h).toBe(false);
    expect(hashOtp('12345', '09123456789', 'other-pepper-value!') === h).toBe(false);
  });
  it('تأیید کد', () => {
    const h = hashOtp('12345', '09123456789', 'pepper-pepper-pepper');
    expect(verifyOtpHash('12345', '09123456789', 'pepper-pepper-pepper', h)).toBe(true);
    expect(verifyOtpHash('12346', '09123456789', 'pepper-pepper-pepper', h)).toBe(false);
    expect(verifyOtpHash('12345', '09123456789', 'pepper-pepper-pepper', 'zz')).toBe(false);
  });
});

describe('decideOtpRequest', () => {
  it('بدون درخواست قبلی مجاز است', () => {
    expect(decideOtpRequest([], NOW)).toEqual({ allowed: true });
  });
  it('فاصله‌ی ۶۰ ثانیه', () => {
    expect(decideOtpRequest([ago(30)], NOW)).toEqual({ allowed: false, reason: 'COOLDOWN', retryAfterSec: 30 });
  });
  it('حداکثر ۳ بار در ۱۰ دقیقه', () => {
    expect(decideOtpRequest([ago(300), ago(240), ago(180)], NOW)).toEqual({
      allowed: false,
      reason: 'LIMIT',
      retryAfterSec: 300,
    });
  });
  it('دو درخواست قبلی مانع نمی‌شود', () => {
    expect(decideOtpRequest([ago(300), ago(240)], NOW)).toEqual({ allowed: true });
  });
  it('درخواست خارج از پنجره حساب نمی‌شود', () => {
    expect(decideOtpRequest([ago(660), ago(300), ago(240)], NOW)).toEqual({ allowed: true });
  });
});
