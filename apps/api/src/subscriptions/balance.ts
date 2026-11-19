import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** بدهی عضو همیشه از ردیف‌ها: اشتراک‌های لغوشده از بدهی کنار می‌روند؛ بازپرداخت بدهی می‌سازد */
export async function computeBalance(tx: Tx, gymId: string, memberId: string): Promise<number> {
  const price = await tx.subscription.aggregate({
    where: { gymId, memberId, cancelledAt: null },
    _sum: { price: true },
  });
  const paid = await tx.payment.aggregate({ where: { gymId, subscription: { memberId } }, _sum: { amount: true } });
  const refunded = await tx.refund.aggregate({ where: { gymId, memberId }, _sum: { amount: true } });
  return (price._sum.price ?? 0) - (paid._sum.amount ?? 0) + (refunded._sum.amount ?? 0);
}

/** بازنویسی مانده‌ی ذخیره‌شده از روی ردیف‌ها؛ مقدار تازه برمی‌گردد */
export async function recomputeBalance(tx: Tx, gymId: string, memberId: string): Promise<number> {
  const balance = await computeBalance(tx, gymId, memberId);
  await tx.member.update({ where: { id: memberId }, data: { balance } });
  return balance;
}

/** جمع پولی که عضو واقعاً داده (پرداخت‌ها منهای بازپرداخت‌ها) — سقف مجاز بازپرداخت */
export async function netPaid(tx: Tx, gymId: string, memberId: string): Promise<number> {
  const paid = await tx.payment.aggregate({ where: { gymId, subscription: { memberId } }, _sum: { amount: true } });
  const refunded = await tx.refund.aggregate({ where: { gymId, memberId }, _sum: { amount: true } });
  return (paid._sum.amount ?? 0) - (refunded._sum.amount ?? 0);
}
