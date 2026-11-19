import { describe, it, expect } from 'vitest';
import { REFRESH_COOKIE, refreshCookieOptions, wantsCookieSession } from '../src/auth/cookie.ts';
import { isAllowedOrigin } from '../src/common/origin.ts';

describe('کوکی نشست وب', () => {
  it('production: Secure + HttpOnly + SameSite=Strict و فقط مسیر auth', () => {
    const o = refreshCookieOptions(true);
    expect(o.secure).toBe(true);
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe('strict');
    expect(o.path).toBe('/api/v1/auth');
    expect(o.maxAge).toBe(30 * 24 * 3600 * 1000);
  });
  it('توسعه: کوکی Secure لازم ندارد', () => {
    expect(refreshCookieOptions(false).secure).toBe(false);
  });
  it('وب بودن از روی هدر Origin تشخیص داده می‌شود', () => {
    expect(wantsCookieSession({ headers: { origin: 'http://localhost:3000' } })).toBe(true);
    expect(wantsCookieSession({ headers: { origin: '' } })).toBe(false);
    expect(wantsCookieSession({ headers: {} })).toBe(false);
  });
  it('نام کوکی ثابت است', () => {
    expect(REFRESH_COOKIE).toBe('fulad_rt');
  });
});

describe('سیاست مبدأ (CSRF)', () => {
  it('کلاینت بدون Origin (اپ) عبور می‌کند', () => {
    expect(isAllowedOrigin(undefined, ['http://localhost:3000'])).toBe(true);
  });
  it('مبدأ مجاز عبور می‌کند و فاصله‌های اطراف بی‌اهمیت‌اند', () => {
    expect(isAllowedOrigin('http://localhost:3000', ['http://localhost:3000'])).toBe(true);
    expect(isAllowedOrigin(' http://localhost:3000 ', ['http://localhost:3000'])).toBe(true);
  });
  it('مبدأ ناشناس رد می‌شود', () => {
    expect(isAllowedOrigin('http://evil.example', ['http://localhost:3000'])).toBe(false);
    expect(isAllowedOrigin('', ['http://localhost:3000'])).toBe(false);
  });
  it('فهرست چند مبدأ (WEB_ORIGIN جدا با ویرگول) پشتیبانی می‌شود', () => {
    expect(isAllowedOrigin('https://g1.example', ['https://g1.example', 'https://g2.example'])).toBe(true);
  });
});
