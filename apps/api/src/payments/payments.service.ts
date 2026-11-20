import { Injectable } from '@nestjs/common';
import { TenantService } from '../tenant/tenant.service';
import { PrismaService } from '../prisma.service';
import { paymentsWhere } from './payments-query';

const PAGE_DEFAULT = 30;
const PAGE_MAX = 100;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenant: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  /** فهرست پرداخت‌های باشگاه با بازه، جستجو، صفحه‌بندی و جمع دوره */
  async list(
    auth: { gymId: string },
    f: { from?: string; to?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = f.page ?? 1;
    const limit = Math.min(PAGE_MAX, f.limit ?? PAGE_DEFAULT);
    const where = paymentsWhere(auth.gymId, f);

    return this.tenant.run(auth.gymId, async (tx) => {
      const [rows, total, sum] = await Promise.all([
        tx.payment.findMany({
          where,
          orderBy: { paidAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            amount: true,
            method: true,
            paidAt: true,
            subscription: { select: { member: { select: { id: true, name: true } } } },
          },
        }),
        tx.payment.count({ where }),
        tx.payment.aggregate({ where, _sum: { amount: true } }),
      ]);
      return {
        items: rows.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          paidAt: p.paidAt.toISOString(),
          memberId: p.subscription.member.id,
          memberName: p.subscription.member.name,
        })),
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        sum: sum._sum.amount ?? 0,
      };
    });
  }

  /** خروجی CSV همان فیلتر فهرست پرداخت‌ها (بدون صفحه‌بندی، سقف ۵۰۰۰ ردیف) */
  async exportCsv(auth: { gymId: string }, f: { from?: string; to?: string; q?: string }) {
    const where = paymentsWhere(auth.gymId, f);
    return this.tenant.run(auth.gymId, async (tx) => {
      const rows = await tx.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        take: 5000,
        select: {
          amount: true,
          method: true,
          paidAt: true,
          subscription: { select: { member: { select: { name: true, phone: true } } } },
        },
      });
      return rows.map((p) => ({
        name: p.subscription.member.name,
        phone: p.subscription.member.phone,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt.toISOString(),
      }));
    });
  }
}