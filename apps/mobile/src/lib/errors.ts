import { ApiError } from './api/client';
import { faDigits } from './format';

/** پیام قابل‌نمایش به کاربر برای هر خطا */
export function messageOf(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'اتصال به اینترنت یا سرور برقرار نشد';
    if (e.status === 429) {
      const r = (e.body as { retryAfterSec?: number } | null)?.retryAfterSec;
      return r ? `${e.message}. ${faDigits(r)} ثانیه بعد دوباره تلاش کنید` : e.message;
    }
    return e.message;
  }
  return 'خطای نامشخص. دوباره تلاش کنید';
}

/** اولین ایراد اعتبارسنجی فیلد (۴۰۰) برای نمایش زیر فیلد */
export function firstIssue(e: unknown): string | null {
  if (!(e instanceof ApiError)) return null;
  const issues = (e.body as { issues?: { message: string }[] } | null)?.issues;
  return issues?.[0]?.message ?? null;
}
