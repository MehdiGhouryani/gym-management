import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_LENGTH = 5;
export const OTP_TTL_SEC = 120;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_COOLDOWN_SEC = 60;
export const OTP_WINDOW_SEC = 600;
export const OTP_MAX_PER_WINDOW = 3;

export const generateOtpCode = (): string =>
  String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

/** کد هرگز خام ذخیره نمی‌شود؛ HMAC با pepper سرور */
export const hashOtp = (code: string, phone: string, pepper: string): string =>
  createHmac('sha256', pepper).update(`${phone}:${code}`).digest('hex');

export function verifyOtpHash(code: string, phone: string, pepper: string, expectedHex: string): boolean {
  const a = Buffer.from(hashOtp(code, phone, pepper), 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type OtpDecision =
  | { allowed: true }
  | { allowed: false; reason: 'COOLDOWN' | 'LIMIT'; retryAfterSec: number };

/** محدودیت درخواست کد برای هر شماره: ۶۰ ثانیه فاصله و حداکثر ۳ بار در ۱۰ دقیقه */
export function decideOtpRequest(createdAts: Date[], now: Date = new Date()): OtpDecision {
  const nowMs = now.getTime();
  const inWindow = createdAts
    .map((d) => d.getTime())
    .filter((t) => nowMs - t < OTP_WINDOW_SEC * 1000)
    .sort((a, b) => a - b);
  const latest = inWindow[inWindow.length - 1];
  if (latest !== undefined && nowMs - latest < OTP_COOLDOWN_SEC * 1000) {
    return {
      allowed: false,
      reason: 'COOLDOWN',
      retryAfterSec: Math.ceil((OTP_COOLDOWN_SEC * 1000 - (nowMs - latest)) / 1000),
    };
  }
  if (inWindow.length >= OTP_MAX_PER_WINDOW) {
    const oldest = inWindow[0] as number;
    return {
      allowed: false,
      reason: 'LIMIT',
      retryAfterSec: Math.ceil((oldest + OTP_WINDOW_SEC * 1000 - nowMs) / 1000),
    };
  }
  return { allowed: true };
}
