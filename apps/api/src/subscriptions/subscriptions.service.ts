import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { planRenewal, todayInTehran } from '@fulad/shared';
import type { PayDebtInput, RenewInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { fromDateOnly, toDateOnly } from '../common/dates';
import { TenantService } from '../tenant/tenant.service';
import { allocatePayment } from './payment-allocation';
import { summarize, toSubscriptionDto } from './subscription.mapper';

type Tx = Prisma.TransactionClient;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly tenant: TenantService) {}

  /** قفل ردیف عضو: دو تمدید یا پرداخت هم‌زمان برای یک عضو پشت سر هم اجرا می‌شوند */
  private async lockMember(tx: Tx, gymId: string, memberId: string) {
    await tx.$queryRaw`SELECT id FROM members WHERE id = ${memberId} AND "gymId" = ${gymId} FOR UPDATE`;
    const member = await tx.member.findFirst({ where: { id: memberId, gymId } });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    if (member.archivedAt) throw new ConflictException({ message: 'عضو بایگانی‌شده را ابتدا بازگردانید', code: 'MEMBER_ARCHIVED' });
    return member;
  }

  /** بدهی از روی ردیف‌ها دوباره محاسبه می‌شود تا هرگز از واقعیت فاصله نگیرد */
  private async recomputeBalance(tx: Tx, gymId: string, memberId: string): Promise<number> {
    const price = await tx.subscription.aggregate({ where: { gymId, memberId }, _sum: { price: true } });
    const paid = await tx.payment.aggregate({ where: { gymId, subscription: { memberId } }, _sum: { amount: true } });
    const balance = (price._sum.price ?? 0) - (paid._sum.amount ?? 0);
    await tx.member.update({ where: { id: memberId }, data: { balance } });
    return balance;
  }

  async renew(auth: AccessPayload, memberId: string, input: RenewInput, ip?: string) {
    const today = todayInTehran();
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await this.lockMember(tx, auth.gymId, memberId);
      const plan = await tx.plan.findFirst({ where: { id: input.planId, gymId: auth.gymId } });
      if (!plan) throw new NotFoundException('پلن پیدا نشد');
      if (!plan.active) throw new ConflictException({ message: 'این پلن غیرفعال است', code: 'PLAN_INACTIVE' });

      const price = input.price ?? plan.price;
      if (price !== plan.price && auth.role !== 'OWNER') {
        throw new ForbiddenException('فقط مدیر باشگاه می‌تواند مبلغ اشتراک را تغییر دهد');
      }
      if (input.paidAmount > price) {
        throw new BadRequestException('مبلغ پرداختی از مبلغ اشتراک بیشتر است. بدهی قبلی را از بخش پرداخت بدهی ثبت کنید');
      }
      const r = planRenewal({
        currentEndsOn: member.currentEndsOn ? toDateOnly(member.currentEndsOn) : null,
        planDays: plan.days,
        today,
        startsOn: input.startsOn,
      });
      if (!r.ok) {
        throw new BadRequestException(
          r.reason === 'OVERLAP' ? 'تاریخ شروع با اشتراک فعلی هم‌پوشانی دارد' : 'تاریخ شروع باید حداکثر ۶۰ روز قبل یا بعد از امروز باشد',
        );
      }

      const sub = await tx.subscription.create({
        data: {
          gymId: auth.gymId,
          memberId,
          planId: plan.id,
          startsOn: fromDateOnly(r.startsOn),
          endsOn: fromDateOnly(r.endsOn),
          price,
        },
      });
      if (input.paidAmount > 0 && input.method) {
        await tx.payment.create({
          data: { gymId: auth.gymId, subscriptionId: sub.id, amount: input.paidAmount, method: input.method },
        });
      }
      await tx.member.update({ where: { id: memberId }, data: { currentEndsOn: fromDateOnly(r.endsOn) } });
      const balance = await this.recomputeBalance(tx, auth.gymId, memberId);
      await writeAudit(tx, {
        gymId: auth.gymId,
        actorId: auth.sub,
        action: 'subscription.create',
        target: `member:${memberId}`,
        meta: { subscriptionId: sub.id, planId: plan.id, price, paid: input.paidAmount, startsOn: r.startsOn, endsOn: r.endsOn },
        ip,
      });

      const full = await tx.subscription.findUniqueOrThrow({
        where: { id: sub.id },
        include: { plan: { select: { name: true } }, payments: { orderBy: { paidAt: 'desc' } } },
      });
      return { subscription: toSubscriptionDto(full), member: { id: memberId, currentEndsOn: r.endsOn, balance } };
    });
  }

  async payDebt(auth: AccessPayload, memberId: string, input: PayDebtInput, ip?: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      await this.lockMember(tx, auth.gymId, memberId);
      const subs = await tx.subscription.findMany({
        where: { gymId: auth.gymId, memberId },
        include: { payments: { select: { amount: true } } },
        orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }],
      });
      const debts = subs
        .map((s) => ({ subscriptionId: s.id, balance: s.price - s.payments.reduce((a, p) => a + p.amount, 0) }))
        .filter((d) => d.balance > 0);
      const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
      if (totalDebt === 0) throw new ConflictException({ message: 'این عضو بدهی ندارد', code: 'NO_DEBT' });
      if (input.amount > totalDebt) {
        throw new BadRequestException({ message: 'مبلغ از کل بدهی بیشتر است', code: 'AMOUNT_EXCEEDS_DEBT', totalDebt });
      }

      const { allocations } = allocatePayment(debts, input.amount);
      for (const a of allocations) {
        await tx.payment.create({
          data: { gymId: auth.gymId, subscriptionId: a.subscriptionId, amount: a.amount, method: input.method },
        });
      }
      const balance = await this.recomputeBalance(tx, auth.gymId, memberId);
      await writeAudit(tx, {
        gymId: auth.gymId,
        actorId: auth.sub,
        action: 'payment.debt',
        target: `member:${memberId}`,
        meta: { amount: input.amount, method: input.method, allocations: allocations.length },
        ip,
      });
      return { allocations, balance };
    });
  }

  async history(auth: AccessPayload, memberId: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, gymId: auth.gymId, ...(auth.role === 'OWNER' ? {} : { archivedAt: null }) },
      });
      if (!member) throw new NotFoundException('عضو پیدا نشد');
      const rows = await tx.subscription.findMany({
        where: { gymId: auth.gymId, memberId },
        include: { plan: { select: { name: true } }, payments: { orderBy: { paidAt: 'desc' } } },
        orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
      });
      const items = rows.map(toSubscriptionDto);
      return { items, summary: summarize(items) };
    });
  }
}
