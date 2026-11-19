import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/lib/api/client.ts';
import { firstIssue, messageOf } from '../src/lib/errors.ts';

describe('پیام خطا', () => {
  it('قطع اتصال', () => {
    expect(messageOf(new ApiError(0, 'x', 'NETWORK'))).toBe('اتصال به اینترنت یا سرور برقرار نشد');
  });
  it('۴۲۹ با زمان انتظار', () => {
    expect(messageOf(new ApiError(429, 'تعداد درخواست کد بیش از حد مجاز است', undefined, { retryAfterSec: 45 }))).toBe(
      'تعداد درخواست کد بیش از حد مجاز است. ۴۵ ثانیه بعد دوباره تلاش کنید',
    );
    expect(messageOf(new ApiError(429, 'کند', undefined, null))).toBe('کند');
  });
  it('پیام سرور و خطای ناشناخته', () => {
    expect(messageOf(new ApiError(401, 'کد نامعتبر یا منقضی است'))).toBe('کد نامعتبر یا منقضی است');
    expect(messageOf(new Error('boom'))).toBe('خطای نامشخص. دوباره تلاش کنید');
  });
  it('اولین ایراد اعتبارسنجی', () => {
    expect(firstIssue(new ApiError(400, 'ورودی نامعتبر است', undefined, { issues: [{ path: 'phone', message: 'شماره‌ی موبایل معتبر نیست' }] }))).toBe('شماره‌ی موبایل معتبر نیست');
    expect(firstIssue(new ApiError(400, 'x'))).toBe(null);
    expect(firstIssue(new Error('x'))).toBe(null);
  });
});
