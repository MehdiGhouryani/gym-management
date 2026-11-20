import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { subscriptionStatus, todayInTehran } from '@fulad/shared';
import type { StatusOptions } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { checkInPermission, isWithinDuplicateWindow } from './checkin-logic';

const TZ = '+03:30';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  /** اسکن QR: توکن عضو → بررسی وضعیت → ثبت ورود (با پنجره‌ی ضدتکرار) */
  async scanCheckIn(auth: AccessPayload, token: string, ip?: string) {
    const today = todayInTehran();
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({
        where: { gymId: auth.gymId, qrToken: token, archivedAt: null },
        include: { subscriptions: { where: { cancelledAt: null }, orderBy: { endsOn: 'desc' }, take: 1, include: { plan: { select: { kind: true, sessionsCount: true } } } } },
      });
      if (!member) throw new NotFoundException('توکن QR معتبر نیست');
      const opts = await this.settings(auth.gymId);
      const s = subscriptionStatus(member.currentEndsOn, today, opts);
      const current = member.subscriptions[0];
      const sessionsRemaining = current?.plan.sessionsCount != null ? Math.max(0, current.plan.sessionsCount - (current.sessionsUsed ?? 0)) : null;
      const perm = checkInPermission({
        status: s.status,
        planKind: current?.plan.kind ?? 'days',
        sessionsRemaining,
      });
      if (!perm.ok) {
        const msg =
          perm.reason === 'NO_SUBSCRIPTION'
            ? 'این عضو اشتراکی ندارد'
            : perm.reason === 'SUBSCRIPTION_ENDED'
              ? 'اشتراک عضو منقضی است'
              : 'جلسه‌های پلن جلسه‌ای تمام شده است';
        throw new ConflictException({ message: msg, code: `CHECKIN_${perm.reason}`, memberName: member.name });
      }

      // ضدتکرار: ورود امروزِ تهران قبلاً ثبت شده؟
      const dayStart = new Date(`${today}T00:00:00${TZ}`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
      const existing = await tx.attendance.findFirst({
        where: { gymId: auth.gymId, memberId: member.id, checkInAt: { gte: dayStart, lt: dayEnd } },
        orderBy: { checkInAt: 'desc' },
      });
      if (existing && isWithinDuplicateWindow(existing.checkInAt.toISOString(), new Date().toISOString())) {
        throw new ConflictException({ message: `${member.name} همین حالا داخل است`, code: 'CHECKIN_DUPLICATE' });
      }

      await tx.attendance.create({
        data: { gymId: auth.gymId, memberId: member.id, method: 'QR' },
      });
      // مصرف جلسه: پلن جلسه‌ای معتبر
      if (current && current.plan.kind === 'sessions' && current.plan.sessionsCount != null) {
        await tx.subscription.update({ where: { id: current.id }, data: { sessionsUsed: (current.sessionsUsed ?? 0) + 1 } });
      }
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'attendance.checkin', target: `member:${member.id}`, meta: { method: 'QR' }, ip });
      return {
        memberId: member.id,
        name: member.name,
        status: s.status,
        daysLeft: s.daysLeft,
        balance: member.balance,
        sessionsRemaining: current?.plan.sessionsCount != null ? Math.max(0, current.plan.sessionsCount - (current.sessionsUsed ?? 0) - (current.plan.kind === 'sessions' ? 1 : 0)) : null,
      };
    });
  }

  /** ثبت دستی ورود با علت */
  async manualCheckIn(auth: AccessPayload, memberId: string, note?: string, ip?: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, gymId: auth.gymId, archivedAt: null }, select: { id: true, name: true } });
      if (!member) throw new NotFoundException('عضو پیدا نشد');
      const attendance = await tx.attendance.create({
        data: { gymId: auth.gymId, memberId, method: 'MANUAL', note: note ?? null },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'attendance.checkin', target: `member:${memberId}`, meta: { method: 'MANUAL' }, ip });
      return { attendanceId: attendance.id, memberId, name: member.name, checkInAt: attendance.checkInAt.toISOString() };
    });
  }

  /** سوابق مراجعه‌ی عضو */
  async memberAttendance(auth: AccessPayload, memberId: string, page = 1, limit = 30) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, gymId: auth.gymId }, select: { id: true } });
      if (!member) throw new NotFoundException('عضو پیدا نشد');
      const [rows, total] = await Promise.all([
        tx.attendance.findMany({
          where: { gymId: auth.gymId, memberId },
          orderBy: { checkInAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.attendance.count({ where: { gymId: auth.gymId, memberId } }),
      ]);
      return {
        items: rows.map((a) => ({ id: a.id, method: a.method, note: a.note, checkInAt: a.checkInAt.toISOString() })),
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      };
    });
  }

  /** کارت QR عضو: توکن فعلی + بازتولید (فقط مدیر) */
  async qrToken(auth: AccessPayload, memberId: string, regenerate: boolean) {
    if (regenerate) {
      if (auth.role !== 'OWNER') throw new ConflictException({ message: 'فقط مدیر می‌تواند توکن را عوض کند', code: 'QR_REGENERATE' });
      return this.tenant.run(auth.gymId, async (tx) => {
        const member = await tx.member.findFirst({ where: { id: memberId, gymId: auth.gymId }, select: { id: true, qrToken: true } });
        if (!member) throw new NotFoundException('عضو پیدا نشد');
        const updated = await tx.member.update({ where: { id: memberId }, data: { qrToken: crypto.randomUUID() }, select: { qrToken: true } });
        return { qrToken: updated.qrToken };
      });
    }
    return this.tenant.run(auth.gymId, async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, gymId: auth.gymId }, select: { qrToken: true } });
      if (!member) throw new NotFoundException('عضو پیدا نشد');
      return { qrToken: member.qrToken };
    });
  }

  private async settings(gymId: string): Promise<StatusOptions> {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { expiringDays: true, graceDays: true } });
    return { expiringDays: g?.expiringDays ?? 7, graceDays: g?.graceDays ?? 14 };
  }
}
