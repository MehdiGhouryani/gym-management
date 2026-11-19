/** منطق خالص بازپرداخت: فقط تا سقف پولی که واقعاً مانده و مانده‌ی عضو را منفی نمی‌کند */
export type RefundRejection = 'EXCEEDS_NET_PAID' | 'WOULD_NEGATE_BALANCE';

export function validateRefund(input: { amount: number; netPaid: number; balance: number }): { ok: true } | { ok: false; reason: RefundRejection } {
  if (input.amount > input.netPaid) return { ok: false, reason: 'EXCEEDS_NET_PAID' };
  // بازپرداخت بدهی را بیشتر می‌کند؛ بدهی منفی در پایگاه داده ممنوع است
  if (input.balance + input.amount < 0) return { ok: false, reason: 'WOULD_NEGATE_BALANCE' };
  return { ok: true };
}
