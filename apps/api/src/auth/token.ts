import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface AccessClaims {
  sub: string;
  typ: 'user' | 'member';
  role?: 'OWNER' | 'STAFF';
  gymId: string;
}
export interface AccessPayload extends AccessClaims {
  iat: number;
  exp: number;
}

export class TokenError extends Error {}

export const ACCESS_TTL_SEC = 900;

const b64 = (v: Buffer | string) => Buffer.from(v).toString('base64url');
// الگوریتم ثابت است؛ هر هدر دیگری (مثل alg=none) رد می‌شود
const HEADER = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const nowSecs = () => Math.floor(Date.now() / 1000);

export function signAccessToken(
  claims: AccessClaims,
  secret: string,
  ttlSec: number = ACCESS_TTL_SEC,
  now: number = nowSecs(),
): string {
  const payload: AccessPayload = { ...claims, iat: now, exp: now + ttlSec };
  const body = `${HEADER}.${b64(JSON.stringify(payload))}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function verifyAccessToken(token: string, secret: string, now: number = nowSecs()): AccessPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('malformed');
  const [h, p, s] = parts as [string, string, string];
  if (h !== HEADER) throw new TokenError('bad header');
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new TokenError('bad signature');
  }
  let payload: Partial<AccessPayload>;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    throw new TokenError('bad payload');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new TokenError('expired');
  if (typeof payload.sub !== 'string' || typeof payload.gymId !== 'string') throw new TokenError('bad claims');
  if (payload.typ !== 'user' && payload.typ !== 'member') throw new TokenError('bad claims');
  return payload as AccessPayload;
}

/** refresh token مبهم است و فقط هش آن در پایگاه داده نگه‌داری می‌شود */
export const generateRefreshToken = (): string => randomBytes(32).toString('base64url');
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
