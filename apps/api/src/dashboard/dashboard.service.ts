import { Injectable, NotFoundException } from '@nestjs/common';
import { todayInTehran } from '@fulad/shared';
import type { StatusOptions } from '@fulad/shared';
import { endsOnWhere } from '../members/member-query';
import { toMemberDto } from '../members/members.mapper';
import { PrismaService } from '../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { aggregatePayments } from '../reports/report-logic';
import { TenantService } from '../tenant/tenant.service';
import type { AccessPayload } from '../auth/token';
import { buildTrendRanges } from './dashboard-logic';

const DAY_MS = 86_400_000;

/** داده‌ی داشبورد: KPIها از گزارش ماهانه، روند ۶ ماه و مرکز پیگیری */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly reports: ReportsService,
  ) {}

  async overview(auth: AccessPayload) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: auth.gymId },
      select: { expiringDays: true, graceDays: true },
    });
    if (!gym) throw new NotFoundException('باشگاه پیدا نشد');
    const opts: StatusOptions = { expiringDays: gym.expiringDays, graceDays: gym.graceDays };

    const report = await this.reports.monthly(auth, {});
    const today = todayInTehran();
    const trendRanges = buildTrendRanges(today, 6);
    const gymId = auth.gymId;

    const winStart = new Date(new Date(`${trendRanges[0].from}T00:00:00Z`).getTime() - DAY_MS);
    const winEnd = new Date(Date.now() + 2 * DAY_MS);

    const data = await this.tenant.run(gymId, async (tx) => {
      const payments = await tx.payment.findMany({
        where: { gymId, paidAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, paidAt: true },
      });
      const refunds = await tx.refund.findMany({
        where: { gymId, refundedAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, refundedAt: true },
      });
      const followUpList = (status: 'expiring' | 'expired') =>        tx.member.findMany({
          where: { gymId, archivedAt: null, ...endsOnWhere(status, today, opts) },
          orderBy: { currentEndsOn: 'asc' },
          take: 5,
        });
      const [expiring, expired, expiringCount, expiredCount] = await Promise.all([
        followUpList('expiring'),
        followUpList('expired'),
        tx.member.count({ where: { gymId, archivedAt: null, ...endsOnWhere('expiring', today, opts) } }),
        tx.member.count({ where: { gymId, archivedAt: null, ...endsOnWhere('expired', today, opts) } }),
      ]);
      return { payments, refunds, expiring, expired, expiringCount, expiredCount };
    });

    const refundRows = data.refunds.map((r) => ({ amount: r.amount, method: r.method, paidAt: r.refundedAt }));
    const trend = trendRanges.map((m) => ({
      label: m.label,
      total: aggregatePayments(data.payments, { from: m.from, to: m.to }, refundRows).total,
    }));

    return {
      kpis: {
        activeMembers: report.members.active,
        monthRevenue: report.revenue.total,
        revenueChangePercent: report.revenue.changePercent,
        receivables: report.receivables.total,
        debtors: report.receivables.debtors,
        newInMonth: report.members.newInMonth,
        followUps: data.expiringCount + data.expiredCount,
      },
      trend,
      recentPayments: report.recentPayments,
      followUps: {
        expiring: data.expiring.map((m) => toMemberDto(m, today, opts)),
        expired: data.expired.map((m) => toMemberDto(m, today, opts)),
      },
    };
  }
}
