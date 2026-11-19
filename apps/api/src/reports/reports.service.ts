import { Injectable, NotFoundException } from '@nestjs/common';
import { JALALI_MONTHS, gregorianToJalali, jalaliMonthRange, previousJalaliMonth, todayInTehran } from '@fulad/shared';
import type { MonthlyReportQuery } from '@fulad/shared';
import type { AccessPayload } from '../auth/token';
import { fromDateOnly, toDateOnly } from '../common/dates';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { aggregatePayments, computeRenewalRate, percentChange } from './report-logic';

const DAY_MS = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  async monthly(auth: AccessPayload, q: MonthlyReportQuery) {
    const gym = await this.prisma.gym.findUnique({ where: { id: auth.gymId }, select: { graceDays: true } });
    if (!gym) throw new NotFoundException('باشگاه پیدا نشد');

    const today = todayInTehran();
    const now = gregorianToJalali(today);
    const jy = q.year ?? now.jy;
    const jm = q.month ?? now.jm;
    const range = jalaliMonthRange(jy, jm);
    const prev = previousJalaliMonth(jy, jm);
    const prevRange = jalaliMonthRange(prev.jy, prev.jm);

    // پنجره‌ی گسترده‌ی UTC؛ مرز دقیق روزها بعداً به وقت تهران اعمال می‌شود
    const winStart = new Date(fromDateOnly(prevRange.from).getTime() - DAY_MS);
    const winEnd = new Date(fromDateOnly(range.to).getTime() + 2 * DAY_MS);
    const gymId = auth.gymId;

    const data = await this.tenant.run(gymId, async (tx) => {
      const payments = await tx.payment.findMany({
        where: { gymId, paidAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, paidAt: true },
      });
      const ended = await tx.subscription.findMany({
        where: { gymId, endsOn: { gte: fromDateOnly(range.from), lte: fromDateOnly(range.to) } },
        select: { memberId: true, endsOn: true },
      });
      const memberIds = [...new Set(ended.map((e) => e.memberId))];
      const later = memberIds.length
        ? await tx.subscription.findMany({
            where: { gymId, memberId: { in: memberIds }, startsOn: { gte: fromDateOnly(range.from) } },
            select: { memberId: true, startsOn: true },
          })
        : [];
      const created = await tx.member.findMany({
        where: { gymId, createdAt: { gte: winStart, lt: winEnd } },
        select: { createdAt: true },
      });
      const debt = await tx.member.aggregate({
        where: { gymId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      });
      const active = await tx.member.count({
        where: { gymId, archivedAt: null, currentEndsOn: { gte: fromDateOnly(today) } },
      });
      const recent = await tx.payment.findMany({
        where: { gymId },
        orderBy: { paidAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          subscription: { select: { member: { select: { id: true, name: true } } } },
        },
      });
      return { payments, ended, later, created, debt, active, recent };
    });

    const current = aggregatePayments(data.payments, range);
    const previous = aggregatePayments(data.payments, prevRange);
    const newInMonth = data.created.filter((m) => {
      const d = todayInTehran(m.createdAt);
      return d >= range.from && d <= range.to;
    }).length;

    return {
      period: { year: jy, month: jm, monthName: JALALI_MONTHS[jm - 1], from: range.from, to: range.to },
      revenue: {
        total: current.total,
        paymentCount: current.count,
        byMethod: current.byMethod,
        weeks: current.weeks,
        previousTotal: previous.total,
        changePercent: percentChange(current.total, previous.total),
      },
      members: { active: data.active, newInMonth },
      renewal: computeRenewalRate(
        data.ended.map((e) => ({ memberId: e.memberId, endsOn: toDateOnly(e.endsOn) })),
        data.later.map((l) => ({ memberId: l.memberId, startsOn: toDateOnly(l.startsOn) })),
        today,
        gym.graceDays,
      ),
      receivables: { total: data.debt._sum.balance ?? 0, debtors: data.debt._count._all },
      recentPayments: data.recent.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        memberId: p.subscription.member.id,
        memberName: p.subscription.member.name,
      })),
    };
  }
}
