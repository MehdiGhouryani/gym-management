import { Injectable, NotFoundException } from '@nestjs/common';
import { JALALI_MONTHS, gregorianToJalali, jalaliMonthRange, previousJalaliMonth, todayInTehran } from '@fulad/shared';
import type { MonthlyReportQuery } from '@fulad/shared';
import type { AccessPayload } from '../auth/token';
import { fromDateOnly, toDateOnly } from '../common/dates';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { aggregatePayments, computeRenewalRate, percentChange, planBreakdown, staffPerformance } from './report-logic';

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
      const refunds = await tx.refund.findMany({
        where: { gymId, refundedAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, refundedAt: true },
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
      return { payments, refunds, ended, later, created, debt, active, recent };
    });

    const refundRows = data.refunds.map((r) => ({ amount: r.amount, method: r.method, paidAt: r.refundedAt }));
    const current = aggregatePayments(data.payments, range, refundRows);
    const previous = aggregatePayments(data.payments, prevRange, refundRows);
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

  /** گزارش سالانه: ۱۲ ماه شمسی با درآمد، تعداد پرداخت و عضو جدید */
  async annual(auth: AccessPayload, year: number) {
    const ranges = Array.from({ length: 12 }, (_, i) => jalaliMonthRange(year, i + 1));
    const winStart = new Date(fromDateOnly(ranges[0].from).getTime() - DAY_MS);
    const winEnd = new Date(fromDateOnly(ranges[11].to).getTime() + 2 * DAY_MS);
    const gymId = auth.gymId;

    const data = await this.tenant.run(gymId, async (tx) => {
      const payments = await tx.payment.findMany({
        where: { gymId, paidAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, paidAt: true },
      });
      const refunds = await tx.refund.findMany({
        where: { gymId, refundedAt: { gte: winStart, lt: winEnd } },
        select: { amount: true, method: true, refundedAt: true },
      });
      const created = await tx.member.findMany({
        where: { gymId, createdAt: { gte: winStart, lt: winEnd } },
        select: { createdAt: true },
      });
      return { payments, refunds, created };
    });
    const refundRows = data.refunds.map((r) => ({ amount: r.amount, method: r.method, paidAt: r.refundedAt }));

    const months = ranges.map((range, i) => {
      const agg = aggregatePayments(data.payments, range, refundRows);
      const newInMonth = data.created.filter((m) => {
        const d = todayInTehran(m.createdAt);
        return d >= range.from && d <= range.to;
      }).length;
      return { month: i + 1, monthName: JALALI_MONTHS[i], revenue: agg.total, paymentCount: agg.count, newInMonth };
    });
    return {
      year,
      months,
      totals: {
        revenue: months.reduce((a, m) => a + m.revenue, 0),
        paymentCount: months.reduce((a, m) => a + m.paymentCount, 0),
        newMembers: months.reduce((a, m) => a + m.newInMonth, 0),
      },
    };
  }

  /** عملکرد پلن‌ها در یک ماه: اشتراک‌های شروع‌شده به تفکیک پلن */
  async planStats(auth: AccessPayload, year?: number, month?: number) {
    const now = gregorianToJalali(todayInTehran());
    const jy = year ?? now.jy;
    const jm = month ?? now.jm;
    const range = jalaliMonthRange(jy, jm);
    const gymId = auth.gymId;
    const rows = await this.tenant.run(gymId, (tx) =>
      tx.subscription.findMany({
        where: { gymId, startsOn: { gte: fromDateOnly(range.from), lte: fromDateOnly(range.to) } },
        select: { planId: true, price: true, plan: { select: { name: true } } },
      }),
    );
    const bd = planBreakdown(rows.map((r) => ({ planId: r.planId, planName: r.plan.name, price: r.price })));
    return { period: { year: jy, month: jm, monthName: JALALI_MONTHS[jm - 1] }, ...bd };
  }

  /** عملکرد کارکنان در یک ماه از لاگ ممیزی (فقط مدیر) */
  async staffStats(auth: AccessPayload, year?: number, month?: number) {
    const now = gregorianToJalali(todayInTehran());
    const jy = year ?? now.jy;
    const jm = month ?? now.jm;
    const range = jalaliMonthRange(jy, jm);
    const winStart = new Date(fromDateOnly(range.from).getTime() - DAY_MS);
    const winEnd = new Date(fromDateOnly(range.to).getTime() + 2 * DAY_MS);
    const gymId = auth.gymId;

    const data = await this.tenant.run(gymId, async (tx) => {
      const events = await tx.auditLog.findMany({
        where: { gymId, at: { gte: winStart, lt: winEnd }, action: { in: ['subscription.create', 'payment.debt'] } },
        select: { actorId: true, action: true, meta: true, at: true },
      });
      const users = await tx.user.findMany({
        where: { gymId },
        select: { id: true, name: true, role: true },
      });
      return { events, users };
    });

    const inRange = data.events.filter((e) => {
      const d = todayInTehran(e.at);
      return d >= range.from && d <= range.to;
    });
    const items = staffPerformance(
      inRange.map((e) => ({
        actorId: e.actorId ?? '',
        action: e.action,
        meta: (e.meta ?? null) as { price?: number; amount?: number } | null,
      })),
    ).map((x) => ({
      ...x,
      name: data.users.find((u) => u.id === x.actorId)?.name ?? 'کاربر حذف‌شده',
    }));
    return { period: { year: jy, month: jm, monthName: JALALI_MONTHS[jm - 1] }, items };
  }
}
