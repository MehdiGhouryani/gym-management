import { parseMemberSearch } from '@fulad/shared';
import type { Prisma } from '@prisma/client';

const TZ = '+03:30'; // تهران بدون ساعت تابستانی

export interface PaymentsFilter {
  from?: string; // YYYY-MM-DD میلادی
  to?: string;
  q?: string;
}

/** بازه‌ی روز تهران برای ستون timestamp: [شروع روز تهران، شروع روز بعد تهران) */
export function tehranDayWindow(fromIso: string, toIso: string): { gte: Date; lt: Date } {
  return {
    gte: new Date(`${fromIso}T00:00:00${TZ}`),
    lt: new Date(`${toIso}T00:00:00${TZ}`),
  };
}

/** شرط Prisma فهرست پرداخت‌های باشگاه با بازه و جستجو (نام یا بخشی از شماره) */
export function paymentsWhere(
  gymId: string,
  f: PaymentsFilter,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { gymId };
  if (f.from && f.to) {
    where.paidAt = tehranDayWindow(f.from, f.to);
  } else if (f.from) {
    where.paidAt = { gte: new Date(`${f.from}T00:00:00${TZ}`) };
  } else if (f.to) {
    where.paidAt = { lt: new Date(`${f.to}T00:00:00${TZ}`) };
  }
  const s = f.q ? parseMemberSearch(f.q) : null;
  if (s?.phone) {
    where.subscription = { member: { phone: { contains: s.phone } } };
  } else if (s?.name) {
    where.subscription = { member: { name: { contains: s.name, mode: 'insensitive' } } };
  }
  return where;
}
