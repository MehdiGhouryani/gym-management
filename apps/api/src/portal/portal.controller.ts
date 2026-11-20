import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConflictException } from '@nestjs/common';
import { subscriptionStatus } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { MemberGuard } from './member.guard';
import { ZodPipe } from '../common/zod.pipe';
import { z } from 'zod';

const renewRequestSchema = z.object({ note: z.string().trim().max(200).optional() });

@Controller('portal')
@UseGuards(AuthGuard, MemberGuard)
export class PortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  /** کارت دیجیتال عضو: وضعیت، بدهی، QR و جلسه‌های پیشِ‌رو */
  @Get('me')
  async me(@CurrentAuth() auth: AccessPayload) {
    const today = new Date().toISOString().slice(0, 10);
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: auth.sub, gymId: auth.gymId, archivedAt: null },
        include: {
          subscriptions: {
            where: { cancelledAt: null },
            orderBy: { endsOn: 'desc' },
            take: 1,
            include: { plan: { select: { name: true, kind: true, sessionsCount: true } } },
          },
        },
      });
      if (!member) throw new ConflictException({ message: 'عضویت شما فعال نیست', code: 'MEMBER_INACTIVE' });
      const gym = await tx.gym.findUnique({ where: { id: auth.gymId }, select: { name: true, slug: true } });
      const opts = { expiringDays: (await this.settings(auth.gymId)).expiringDays, graceDays: (await this.settings(auth.gymId)).graceDays };
      const s = subscriptionStatus(member.currentEndsOn, today, opts);
      const upcoming = await tx.booking.findMany({
        where: { gymId: auth.gymId, memberId: member.id, status: { in: ['BOOKED', 'WAITLIST'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { session: { include: { class: { select: { name: true } } } } },
      });
      const current = member.subscriptions[0];
      return {
        name: member.name,
        gymName: gym?.name ?? '',
        gymSlug: gym?.slug ?? '',
        status: s.status,
        daysLeft: s.daysLeft,
        currentEndsOn: member.currentEndsOn ? member.currentEndsOn.toISOString().slice(0, 10) : null,
        planName: current?.plan.name ?? null,
        sessionsRemaining: current?.plan.sessionsCount != null ? Math.max(0, current.plan.sessionsCount - (current.sessionsUsed ?? 0)) : null,
        balance: member.balance,
        qrToken: member.qrToken,
        bookings: upcoming.map((b) => ({
          id: b.id,
          status: b.status,
          className: b.session.class.name,
          startsAt: b.session.startsAt.toISOString(),
        })),
      };
    });
  }

  /** تاریخچه پرداخت‌های خود عضو */
  @Get('me/payments')
  async payments(@CurrentAuth() auth: AccessPayload) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const rows = await tx.payment.findMany({
        where: { gymId: auth.gymId, subscription: { memberId: auth.sub } },
        orderBy: { paidAt: 'desc' },
        take: 50,
        select: { id: true, amount: true, method: true, paidAt: true },
      });
      return {
        items: rows.map((p) => ({ id: p.id, amount: p.amount, method: p.method, paidAt: p.paidAt.toISOString() })),
      };
    });
  }

  /** سابقه مراجعه خود عضو */
  @Get('me/attendance')
  async attendance(@CurrentAuth() auth: AccessPayload) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const rows = await tx.attendance.findMany({
        where: { gymId: auth.gymId, memberId: auth.sub },
        orderBy: { checkInAt: 'desc' },
        take: 30,
        select: { id: true, checkInAt: true },
      });
      return { items: rows.map((a) => ({ id: a.id, checkInAt: a.checkInAt.toISOString() })) };
    });
  }

  /** درخواست تمدید → به‌عنوان Request OPEN در مرکز پیگیری مدیر می‌آید */
  @Post('renew-request')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async renewRequest(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(renewRequestSchema)) _body: { note?: string }) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: auth.sub, gymId: auth.gymId, archivedAt: null },
        select: { id: true, phone: true, name: true },
      });
      if (!member) throw new ConflictException({ message: 'عضویت شما فعال نیست', code: 'MEMBER_INACTIVE' });
      const open = await tx.request.findFirst({
        where: { gymId: auth.gymId, memberId: member.id, status: 'OPEN' },
        select: { id: true },
      });
      if (open) throw new ConflictException({ message: 'درخواست تمدید قبلاً ثبت شده و در بررسی است', code: 'REQUEST_OPEN' });
      await tx.request.create({ data: { gymId: auth.gymId, memberId: member.id, phone: member.phone, name: member.name, type: 'RENEW' } });
      return { ok: true };
    });
  }

  private async settings(gymId: string) {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { expiringDays: true, graceDays: true } });
    return { expiringDays: g?.expiringDays ?? 7, graceDays: g?.graceDays ?? 14 };
  }
}
