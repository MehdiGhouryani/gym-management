import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizePhone } from '@fulad/shared';
import type { CreateClassInput, CreateCoachInput, CreateSessionInput, UpdateClassInput, UpdateCoachInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { decideBooking, firstWaitlistBooking } from './booking-logic';


const requireOwner = (auth: AccessPayload) => {
  if (auth.role !== 'OWNER') throw new ForbiddenException('فقط مدیر باشگاه');
};

@Injectable()
export class ClassesService {
  constructor(
    private readonly tenant: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------- مربیان ----------
  listCoaches(auth: AccessPayload) {
    return this.tenant.run(auth.gymId, (tx) =>
      tx.coach.findMany({ where: { gymId: auth.gymId }, orderBy: { name: 'asc' }, include: { classes: { where: { active: true }, select: { id: true, name: true } } } }),
    );
  }

  async createCoach(auth: AccessPayload, input: CreateCoachInput, ip?: string) {
    const phone = input.phone ? normalizePhone(input.phone) : null;
    return this.tenant.run(auth.gymId, async (tx) => {
      const coach = await tx.coach.create({
        data: { gymId: auth.gymId, name: input.name, specialty: input.specialty ?? null, phone },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'coach.create', target: `coach:${coach.id}`, ip });
      return coach;
    });
  }

  async updateCoach(auth: AccessPayload, id: string, input: UpdateCoachInput, ip?: string) {
    requireOwner(auth);
    return this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.coach.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('مربی پیدا نشد');
      const coach = await tx.coach.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
          ...(input.phone !== undefined ? { phone: input.phone ? normalizePhone(input.phone) : null } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'coach.update', target: `coach:${id}`, ip });
      return coach;
    });
  }

  // ---------- کلاس‌ها ----------
  listClasses(auth: AccessPayload) {
    return this.tenant.run(auth.gymId, (tx) =>
      tx.class.findMany({
        where: { gymId: auth.gymId },
        orderBy: { name: 'asc' },
        include: { coach: { select: { name: true } }, sessions: { orderBy: { startsAt: 'desc' }, take: 5, select: { id: true, startsAt: true } } },
      }),
    );
  }

  async createClass(auth: AccessPayload, input: CreateClassInput, ip?: string) {
    requireOwner(auth);
    return this.tenant.run(auth.gymId, async (tx) => {
      const dup = await tx.class.findFirst({ where: { gymId: auth.gymId, name: { equals: input.name, mode: 'insensitive' } } });
      if (dup) throw new ConflictException({ message: 'کلاسی با این نام وجود دارد', code: 'CLASS_EXISTS' });
      if (input.coachId) {
        const coach = await tx.coach.findFirst({ where: { id: input.coachId, gymId: auth.gymId, active: true } });
        if (!coach) throw new NotFoundException('مربی پیدا نشد');
      }
      const created = await tx.class.create({
        data: { gymId: auth.gymId, name: input.name, coachId: input.coachId ?? null, capacity: input.capacity, durationMin: input.durationMin },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'class.create', target: `class:${created.id}`, ip });
      return created;
    });
  }

  async updateClass(auth: AccessPayload, id: string, input: UpdateClassInput, ip?: string) {
    requireOwner(auth);
    return this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.class.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('کلاس پیدا نشد');
      const cls = await tx.class.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.coachId !== undefined ? { coachId: input.coachId } : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.durationMin !== undefined ? { durationMin: input.durationMin } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'class.update', target: `class:${id}`, ip });
      return cls;
    });
  }

  // ---------- جلسه‌ها ----------
  async addSession(auth: AccessPayload, classId: string, input: CreateSessionInput, ip?: string) {
    requireOwner(auth);
    return this.tenant.run(auth.gymId, async (tx) => {
      const cls = await tx.class.findFirst({ where: { id: classId, gymId: auth.gymId, active: true } });
      if (!cls) throw new NotFoundException('کلاس پیدا نشد');
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('تاریخ جلسه نامعتبر است');
      const session = await tx.classSession.create({ data: { gymId: auth.gymId, classId, startsAt } });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'session.create', target: `session:${session.id}`, ip });
      return session;
    });
  }

  listSessions(auth: AccessPayload, classId: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const cls = await tx.class.findFirst({ where: { id: classId, gymId: auth.gymId }, select: { id: true, capacity: true } });
      if (!cls) throw new NotFoundException('کلاس پیدا نشد');
      const sessions = await tx.classSession.findMany({
        where: { gymId: auth.gymId, classId },
        orderBy: { startsAt: 'asc' },
        take: 50,
        include: { bookings: { where: { status: { in: ['BOOKED', 'ATTENDED', 'WAITLIST'] } }, select: { status: true, createdAt: true } } },
      });
      return {
        items: sessions.map((s) => {
          const active = s.bookings.filter((b) => b.status === 'BOOKED' || b.status === 'ATTENDED').length;
          return { id: s.id, startsAt: s.startsAt.toISOString(), booked: active, waitlist: s.bookings.length - active, capacity: cls.capacity };
        }),
      };
    });
  }

  listSessionBookings(auth: AccessPayload, sessionId: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const session = await tx.classSession.findFirst({
        where: { id: sessionId, gymId: auth.gymId },
        include: { class: { select: { name: true, capacity: true } } },
      });
      if (!session) throw new NotFoundException('جلسه پیدا نشد');
      const rows = await tx.booking.findMany({
        where: { gymId: auth.gymId, sessionId },
        orderBy: { createdAt: 'asc' },
        include: { member: { select: { id: true, name: true, phone: true } } },
      });
      return {
        session: { id: session.id, startsAt: session.startsAt.toISOString(), className: session.class.name, capacity: session.class.capacity },
        items: rows.map((b) => ({
          id: b.id,
          status: b.status,
          memberId: b.member.id,
          memberName: b.member.name,
          memberPhone: b.member.phone,
          createdAt: b.createdAt.toISOString(),
        })),
      };
    });
  }

  /** رزرو: ظرفیت پر → فهرست انتظار؛ لغو قبلی → دوباره فعال */
  async book(auth: AccessPayload, sessionId: string, memberId: string, ip?: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const session = await tx.classSession.findFirst({
        where: { id: sessionId, gymId: auth.gymId },
        include: { class: { select: { capacity: true } } },
      });
      if (!session) throw new NotFoundException('جلسه پیدا نشد');
      const member = await tx.member.findFirst({ where: { id: memberId, gymId: auth.gymId, archivedAt: null }, select: { id: true, name: true } });
      if (!member) throw new NotFoundException('عضو پیدا نشد');

      const existing = await tx.booking.findUnique({ where: { sessionId_memberId: { sessionId, memberId } } });
      const activeCount = await tx.booking.count({ where: { gymId: auth.gymId, sessionId, status: { in: ['BOOKED', 'ATTENDED'] } } });
      const decision = decideBooking({ bookedCount: activeCount, capacity: session.class.capacity, existingStatus: existing?.status ?? null });
      if (decision.kind === 'ERROR') {
        throw new ConflictException({
          message: decision.reason === 'ALREADY_BOOKED' ? `${member.name} قبلاً در این جلسه رزرو دارد` : 'ظرفیت و فهرست انتظار',
          code: decision.reason,
        });
      }
      const status = decision.kind;
      const booking = existing
        ? await tx.booking.update({ where: { id: existing.id }, data: { status } })
        : await tx.booking.create({ data: { gymId: auth.gymId, sessionId, memberId, status } });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'booking.create', target: `booking:${booking.id}`, meta: { status }, ip });
      return { bookingId: booking.id, status };
    });
  }

  /** تغییر وضعیت رزرو: لغو با ارتقای اول فهرست انتظار، حضور */
  async updateBooking(auth: AccessPayload, bookingId: string, status: 'CANCELLED' | 'ATTENDED', ip?: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, gymId: auth.gymId },
        include: { session: { include: { class: { select: { capacity: true } } } } },
      });
      if (!booking) throw new NotFoundException('رزرو پیدا نشد');
      if (booking.status === status) return { bookingId, status };
      await tx.booking.update({ where: { id: bookingId }, data: { status } });

      let promoted: string | null = null;
      if (status === 'CANCELLED' && booking.status === 'BOOKED') {
        const all = await tx.booking.findMany({
          where: { gymId: auth.gymId, sessionId: booking.sessionId },
          select: { id: true, status: true, createdAt: true },
        });
        promoted = firstWaitlistBooking(all.map((b) => ({ id: b.id, status: b.status, createdAt: b.createdAt.toISOString() })));
        if (promoted) {
          const activeCount = await tx.booking.count({ where: { gymId: auth.gymId, sessionId: booking.sessionId, status: { in: ['BOOKED', 'ATTENDED'] } } });
          if (activeCount < booking.session.class.capacity) {
            await tx.booking.update({ where: { id: promoted }, data: { status: 'BOOKED' } });
          } else {
            promoted = null;
          }
        }
      }
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'booking.update', target: `booking:${bookingId}`, meta: { status, promoted }, ip });
      return { bookingId, status, promoted };
    });
  }
}
