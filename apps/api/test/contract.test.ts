import { describe, it, expect } from 'vitest';
import { IDEMPOTENCY_TTL_MS, decideIdempotency, idempotencyRequestHash } from '../src/common/idempotency.ts';
import { normalizeErrorBody } from '../src/common/http-exception.filter.ts';

describe('idempotency', () => {
  const hash = idempotencyRequestHash({ a: 1, b: 'x' });
  it('بدون رکورد قبلی: اجرای تازه', () => {
    expect(decideIdempotency(null, hash)).toEqual({ kind: 'fresh' });
  });
  it('همان بدنه: پاسخ ذخیره‌شده با همان کد وضعیت', () => {
    const stored = { requestHash: hash, statusCode: 201, response: { ok: 1 } };
    expect(decideIdempotency(stored, hash)).toEqual({ kind: 'replay', statusCode: 201, response: { ok: 1 } });
  });
  it('همان کلید با بدنه‌ی متفاوت: تعارض', () => {
    const stored = { requestHash: hash, statusCode: 201, response: { ok: 1 } };
    expect(decideIdempotency(stored, idempotencyRequestHash({ a: 2 }))).toEqual({ kind: 'conflict' });
  });
  it('هش وابسته به ترتیب پارامترها و محتواست', () => {
    expect(idempotencyRequestHash([1, 2])).not.toBe(idempotencyRequestHash([2, 1]));
    expect(idempotencyRequestHash([1, 2])).toBe(idempotencyRequestHash([1, 2]));
  });
  it('مهلت نگه‌داری ۲۴ ساعت است', () => {
    expect(IDEMPOTENCY_TTL_MS).toBe(24 * 3600 * 1000);
  });
});

describe('پاکت خطای استاندارد', () => {
  it('بدنه‌ی رشته‌ای به شکل استاندارد درمی‌آید', () => {
    expect(normalizeErrorBody(404, 'عضو پیدا نشد')).toEqual({ statusCode: 404, message: 'عضو پیدا نشد' });
  });
  it('بدنه‌ی شیء statusCode را همیشه دارد و جزئیات حفظ می‌شوند', () => {
    const out = normalizeErrorBody(409, { message: 'تکراری', code: 'MEMBER_EXISTS', existingMemberId: 'x' });
    expect(out.statusCode).toBe(409);
    expect(out.code).toBe('MEMBER_EXISTS');
    expect(out.existingMemberId).toBe('x');
  });
  it('statusCode تزریقی جایگزین ناهماهنگی می‌شود نه اینکه دوبل شود', () => {
    const out = normalizeErrorBody(400, { message: 'بد' });
    expect(Object.keys(out).filter((k) => k === 'statusCode').length).toBe(1);
  });
});
