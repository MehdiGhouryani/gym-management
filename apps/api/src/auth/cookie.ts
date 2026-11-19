import type { CookieOptions, Request } from 'express';

/** کوکی refresh token برای وب؛ HttpOnly و فقط در مسیرهای auth خوانده می‌شود */
export const REFRESH_COOKIE = 'fulad_rt';
export const REFRESH_COOKIE_TTL_SEC = 30 * 24 * 3600;

export function refreshCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_TTL_SEC * 1000,
  };
}

/** مرورگر همیشه Origin می‌فرستد؛ کلاینت‌های اپ نمی‌فرستند. وب = نشست با کوکی، اپ = توکن در بدنه */
export function wantsCookieSession(req: Pick<Request, 'headers'>): boolean {
  const origin = req.headers.origin;
  return typeof origin === 'string' && origin.length > 0;
}
