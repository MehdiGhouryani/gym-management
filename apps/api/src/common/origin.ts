/**
 * دفاع در عمق CSRF: کلاینت‌های غیرمرورگری (اپ) Origin نمی‌فرستند و رد می‌شوند؛
 * اگر مرورگری Origin فرستاد باید در فهرست مجاز باشد. در production همه‌چیز پشت
 * یک دامنه (Nginx) است و همین سیاست امن می‌ماند.
 */
export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  if (origin === undefined) return true;
  return allowed.includes(origin.trim());
}
