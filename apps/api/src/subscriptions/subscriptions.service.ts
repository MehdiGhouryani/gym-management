import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { addDays, planRenewal, todayInTehran } from '@fulad/shared';
import type { FreezeInput, PayDebtInput, RenewInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { fromDateOnly, toDateOnly } from '../common/dates';
import { IDEMPOTENCY_TTL_MS, decideIdempotency, idempotencyRequestHash } from '../common/idempotency';
import { TenantService } from '../tenant/tenant.service';
import { allocatePayment } from './payment-allocation';
import { cancelledEndsOn, discountPrice, freezeChecks, MAX_FREEZE_TOTAL } from './subscription-v2';
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

  async renew(auth: AccessPayload, memberId: string, input: RenewInput, ip?: string, idempotencyKey?: string) {
    if (!idempotencyKey) return this.tenant.run(auth.gymId, (tx) => this.renewTx(tx, auth, memberId, input, ip));
    // با کلید: بررسی پاسخ ذخیره‌شده و ثبت نتیجه در همان تراکنشِ عملیات مالی
    return this.idempotent(
      auth,
      memberId,
      input,
      idempotencyKey,
      (tx) => this.renewTx(tx, auth, memberId, input, ip),
    );
  }

  async payDebt(auth: AccessPayload, memberId: string, input: PayDebtInput, ip?: string, idempotencyKey?: string) {
    if (!idempotencyKey) return this.tenant.run(auth.gymId, (tx) => this.payDebtTx(tx, auth, memberId, input, ip));
    return this.idempotent(
      auth,
      memberId,
      input,
      idempotencyKey,
      (tx) => this.payDebtTx(tx, auth, memberId, input, ip),
    );
  }

  /**
   * اجرای عملیات مالی با Idempotency-Key: همان کلید و همان بدنه = پاسخ اصلی بدون اجرای دوباره؛
   * همان کلید با بدنه‌ی متفاوت = ۴۰۹. ثبت پاسخ در همان تراکنش است، پس خطای نیمه‌کاره جا نمی‌ماند.
   */
  private async idempotent<R>(
    auth: AccessPayload,
    memberId: string,
    input: unknown,
    key: string,
    run: (tx: Tx) => Promise<R>,
  ): Promise<R> {
    const requestHash = idempotencyRequestHash([auth.gymId, memberId, input]);
    return this.tenant.run(auth.gymId, async (tx) => {
      const existing = await tx.idempotencyKey.findUnique({
        where: { gymId_key: { gymId: auth.gymId, key } },
      });
      if (existing) {
        if (existing.expiresAt <= new Date()) {
          await tx.idempotencyKey.delete({ where: { id: existing.id } });
        } else {
          const d = decideIdempotency<R>(
            { requestHash: existing.requestHash, statusCode: existing.statusCode, response: existing.response as R | null },
            requestHash,
          );
          if (d.kind === 'conflict') {
            throw new ConflictException({ message: 'این کلید برای درخواست دیگری استفاده شده است', code: 'IDEMPOTENCY_CONFLICT' });
          }
          if (d.kind === 'replay' && d.response) return d.response;
        }
      }
      const result = await run(tx);
      await tx.idempotencyKey.create({
        data: {
          gymId: auth.gymId,
          key,
          requestHash,
          statusCode: 201,
          response: result as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        },
      });
      return result;
    });
  }

  private async renewTx(tx: Tx, auth: AccessPayload, memberId: string, input: RenewInput, ip?: string) {
    const today = todayInTehran();
    const member = await this.lockMember(tx, auth.gymId, memberId);
    const plan = await tx.plan.findFirst({ where: { id: input.planId, gymId: auth.gymId } });
    if (!plan) throw new NotFoundException('پلن پیدا نشد');
    if (!plan.active) throw new ConflictException({ message: 'این پلن غیرفعال است', code: 'PLAN_INACTIVE' });

    const price = input.price ?? (input.discountPercent !== undefined ? discountPrice(plan.price, input.discountPercent) : plan.price);
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
        sessionsUsed: plan.kind === 'sessions' ? 0 : null,
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
      include: { plan: { select: { name: true, kind: true, sessionsCount: true } }, payments: { orderBy: { paidAt: 'desc' } } },
    });
    return { subscription: toSubscriptionDto(full), member: { id: memberId, currentEndsOn: r.endsOn, balance } };
  }

  private async payDebtTx(tx: Tx, auth: AccessPayload, memberId: string, input: PayDebtInput, ip?: string) {
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
  }

  /** توقف موقت اشتراک: پایان اشتراک کش داده می‌شود (فقط مدیر، حداکثر ۳۰ روز مجموع) */
  async freeze(auth: AccessPayload, memberId: string, subId: string, input: FreezeInput, ip?: string) {
    const today = todayInTehran();
    return this.tenant.run(auth.gymId, async (tx) => {
      await this.lockMember(tx, auth.gymId, memberId);
      const sub = await tx.subscription.findFirst({ where: { id: subId, gymId: auth.gymId, memberId } });
      if (!sub) throw new NotFoundException('اشتراک پیدا نشد');
      const check = freezeChecks({
        days: input.days,
        frozenDays: sub.frozenDays,
        endsOn: toDateOnly(sub.endsOn),
        today,
        cancelled: sub.cancelledAt !== null,
      });
      if (!check.ok) {
        const msg =
          check.reason === 'TOTAL'
            ? `مجموع توقف موقت نمی‌تواند از ${MAX_FREEZE_TOTAL} روز بیشتر شود`
            : check.reason === 'PAST'
              ? 'اشتراک منقضی قابل توقف نیست'
              : 'اشتراک لغوشده قابل توقف نیست';
        throw new ConflictException({ message: msg, code: `FREEZE_${check.reason}` });
      }
      const newEndsOn = addDays(toDateOnly(sub.endsOn), input.days);
      await tx.subscription.update({
        where: { id: sub.id },
        data: { endsOn: fromDateOnly(newEndsOn), frozenDays: { increment: input.days } },
      });
      await this.recomputeMemberEndsOn(tx, auth.gymId, memberId);
      await writeAudit(tx, {
        gymId: auth.gymId,
        actorId: auth.sub,
        action: 'subscription.freeze',
        target: `subscription:${sub.id}`,
        meta: { days: input.days, newEndsOn },
        ip,
      });
      const full = await tx.subscription.findUniqueOrThrow({
        where: { id: sub.id },
        include: { plan: { select: { name: true, kind: true, sessionsCount: true } }, payments: { orderBy: { paidAt: 'desc' } } },
      });
      return toSubscriptionDto(full);
    });
  }

  /** لغو اشتراک: اگر پایان آینده دارد، امروز تمام می‌شود؛ بدهی باقی می‌ماند (بازپرداخت با هسته مالی) */
  async cancel(auth: AccessPayload, memberId: string, subId: string, ip?: string) {
    const today = todayInTehran();
    return this.tenant.run(auth.gymId, async (tx) => {
      await this.lockMember(tx, auth.gymId, memberId);
      const sub = await tx.subscription.findFirst({ where: { id: subId, gymId: auth.gymId, memberId } });
      if (!sub) throw new NotFoundException('اشتراک پیدا نشد');
      if (sub.cancelledAt) throw new ConflictException({ message: 'این اشتراک قبلاً لغو شده است', code: 'ALREADY_CANCELLED' });
      const endsOn = cancelledEndsOn(toDateOnly(sub.endsOn), today);
      await tx.subscription.update({
        where: { id: sub.id },
        data: { cancelledAt: new Date(), endsOn: fromDateOnly(endsOn) },
      });
      await this.recomputeMemberEndsOn(tx, auth.gymId, memberId);
      await writeAudit(tx, {
        gymId: auth.gymId,
        actorId: auth.sub,
        action: 'subscription.cancel',
        target: `subscription:${sub.id}`,
        meta: { endsOn },
        ip,
      });
      const full = await tx.subscription.findUniqueOrThrow({
        where: { id: sub.id },
        include: { plan: { select: { name: true, kind: true, sessionsCount: true } }, payments: { orderBy: { paidAt: 'desc' } } },
      });
      return toSubscriptionDto(full);
    });
  }

  /** پایان معتبر عضو = دیرترین پایان اشتراک‌های لغو‌نشده؛ بعد از هر تغییر ساختاری دوباره حساب می‌شود */
  private async recomputeMemberEndsOn(tx: Tx, gymId: string, memberId: string) {
    const latest = await tx.subscription.findFirst({
      where: { gymId, memberId, cancelledAt: null },
      orderBy: { endsOn: 'desc' },
      select: { endsOn: true },
    });
    await tx.member.update({ where: { id: memberId }, data: { currentEndsOn: latest ? latest.endsOn : null } });
  }

  async history(auth: AccessPayload, memberId: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, gymId: auth.gymId, ...(auth.role === 'OWNER' ? {} : { archivedAt: null }) },
      });
      if (!member) throw new NotFoundException('عضو پیدا نشد');
      const rows = await tx.subscription.findMany({
        where: { gymId: auth.gymId, memberId },
        include: { plan: { select: { name: true, kind: true, sessionsCount: true } }, payments: { orderBy: { paidAt: 'desc' } } },
        orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
      });
      const items = rows.map(toSubscriptionDto);
      return { items, summary: summarize(items) };
    });
  }
}
