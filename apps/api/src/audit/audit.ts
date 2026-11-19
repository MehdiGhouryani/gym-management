import type { Prisma } from '@prisma/client';

/** لاگ ممیزی داخل همان تراکنشِ تغییر نوشته می‌شود تا یا هر دو ثبت شوند یا هیچ‌کدام */
export function writeAudit(
  tx: Prisma.TransactionClient,
  e: { actorId: string; action: string; target?: string; meta?: Prisma.InputJsonValue; ip?: string },
) {
  return tx.auditLog.create({
    data: { actorId: e.actorId, action: e.action, target: e.target ?? null, meta: e.meta, ip: e.ip ?? null },
  });
}
