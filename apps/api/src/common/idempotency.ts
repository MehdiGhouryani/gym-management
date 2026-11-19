import { createHash } from 'node:crypto';

/** تصمیم Idempotency-Key: پاسخ ذخیره‌شده، تعارض، یا اجرای تازه */
export type IdempotencyDecision<R> =
  | { kind: 'replay'; statusCode: number; response: R }
  | { kind: 'conflict' }
  | { kind: 'fresh' };

export interface StoredIdempotency<R> {
  requestHash: string;
  statusCode: number;
  response: R | null;
}

export const idempotencyRequestHash = (parts: unknown): string =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

export function decideIdempotency<R>(
  stored: StoredIdempotency<R> | null,
  requestHash: string,
): IdempotencyDecision<R> {
  if (!stored) return { kind: 'fresh' };
  if (stored.requestHash !== requestHash) return { kind: 'conflict' };
  // درخواست تکراری همان بدنه: پاسخ اصلی با همان کد وضعیت بازگردانده می‌شود
  return { kind: 'replay', statusCode: stored.statusCode, response: stored.response as R };
}

export const IDEMPOTENCY_TTL_MS = 24 * 3600 * 1000;
