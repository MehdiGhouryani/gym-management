import { describe, it, expect } from 'vitest';
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '../src/auth/token.ts';

const SECRET = 'a-very-long-test-secret-of-32-chars!!';
const CLAIMS = { sub: 'u1', typ: 'user' as const, role: 'OWNER' as const, gymId: 'g1' };
const throws = (fn: () => unknown) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

describe('access token', () => {
  it('امضا و تأیید', () => {
    const t = signAccessToken(CLAIMS, SECRET, 900, 1000);
    expect(verifyAccessToken(t, SECRET, 1500)).toEqual({ ...CLAIMS, iat: 1000, exp: 1900 });
  });
  it('منقضی‌شدن دقیقاً در لحظه‌ی exp', () => {
    const t = signAccessToken(CLAIMS, SECRET, 900, 1000);
    expect(throws(() => verifyAccessToken(t, SECRET, 1899))).toBe(false);
    expect(throws(() => verifyAccessToken(t, SECRET, 1900))).toBe(true);
  });
  it('رمز اشتباه رد می‌شود', () => {
    const t = signAccessToken(CLAIMS, SECRET, 900, 1000);
    expect(throws(() => verifyAccessToken(t, 'another-secret-of-32-characters!!!', 1500))).toBe(true);
  });
  it('دست‌کاری محتوا (تغییر باشگاه) رد می‌شود', () => {
    const [h, , s] = signAccessToken(CLAIMS, SECRET, 900, 1000).split('.');
    const forged = `${h}.${b64({ ...CLAIMS, gymId: 'g2', iat: 1000, exp: 1900 })}.${s}`;
    expect(throws(() => verifyAccessToken(forged, SECRET, 1500))).toBe(true);
  });
  it('alg=none و هدر دیگر رد می‌شود', () => {
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...CLAIMS, iat: 1, exp: 9999999999 })}.`;
    expect(throws(() => verifyAccessToken(none, SECRET, 1500))).toBe(true);
    expect(throws(() => verifyAccessToken('abc', SECRET, 1500))).toBe(true);
    expect(throws(() => verifyAccessToken('a.b.c.d', SECRET, 1500))).toBe(true);
  });
});

describe('refresh token', () => {
  it('تصادفی و یکتا است و هش پایدار دارد', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a === b).toBe(false);
    expect(a.length >= 40).toBe(true);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a) === hashToken(b)).toBe(false);
  });
});
