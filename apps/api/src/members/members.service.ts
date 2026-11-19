import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseMemberSearch, todayInTehran } from '@fulad/shared';
import type { ListMembersQuery, MemberFieldsInput, StatusOptions, UpdateMemberInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { fromDateOnly, isPlausibleBirthDate } from '../common/dates';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { endsOnWhere } from './member-query';
import { toMemberDto } from './members.mapper';

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  private async settings(gymId: string): Promise<StatusOptions> {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { expiringDays: true, graceDays: true } });
    if (!g) throw new NotFoundException('باشگاه پیدا نشد');
    return { expiringDays: g.expiringDays, graceDays: g.graceDays };
  }

  private checkBirthDate(birthDate: string | null | undefined, today: string) {
    if (birthDate && !isPlausibleBirthDate(birthDate, today)) throw new BadRequestException('تاریخ تولد معتبر نیست');
  }

  private duplicate(m: { id: string; archivedAt: Date | null }) {
    return new ConflictException({
      message: m.archivedAt ? 'این شماره در بایگانی است. عضو را بازگردانید' : 'این شماره قبلاً ثبت شده است',
      code: m.archivedAt ? 'MEMBER_ARCHIVED' : 'MEMBER_EXISTS',
      existingMemberId: m.id,
    });
  }

  async list(auth: AccessPayload, q: ListMembersQuery) {
    if (q.archived && auth.role !== 'OWNER') throw new ForbiddenException('فقط مدیر باشگاه به بایگانی دسترسی دارد');
    const opts = await this.settings(auth.gymId);
    const today = todayInTehran();

    const and: Prisma.MemberWhereInput[] = [];
    const s = parseMemberSearch(q.q);
    if (s.name) and.push({ name: { contains: s.name, mode: 'insensitive' } });
    if (s.phone) and.push({ phone: { contains: s.phone } });
    if (q.status) and.push(endsOnWhere(q.status, today, opts));
    if (q.debtor) and.push({ balance: { gt: 0 } });
    const where: Prisma.MemberWhereInput = {
      gymId: auth.gymId,
      archivedAt: q.archived ? { not: null } : null,
      AND: and,
    };
    // نزدیک‌ترین انقضا بالا؛ بدون اشتراک آخر فهرست
    const orderBy: Prisma.MemberOrderByWithRelationInput[] = [
      { currentEndsOn: { sort: 'asc', nulls: 'last' } },
      { name: 'asc' },
      { id: 'asc' },
    ];

    const { rows, total } = await this.tenant.run(auth.gymId, async (tx) => {
      const rows = await tx.member.findMany({ where, orderBy, skip: (q.page - 1) * q.limit, take: q.limit });
      const total = await tx.member.count({ where });
      return { rows, total };
    });
    return {
      items: rows.map((m) => toMemberDto(m, today, opts)),
      total,
      page: q.page,
      limit: q.limit,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  /** شمارنده‌ی چیپ‌های فیلتر در اپ */
  async counts(auth: AccessPayload) {
    const opts = await this.settings(auth.gymId);
    const today = todayInTehran();
    const base: Prisma.MemberWhereInput = { gymId: auth.gymId, archivedAt: null };
    return this.tenant.run(auth.gymId, async (tx) => {
      const count = (status?: Parameters<typeof endsOnWhere>[0]) =>
        tx.member.count({ where: status ? { ...base, ...endsOnWhere(status, today, opts) } : base });
      const all = await count();
      const active = await count('active');
      const expiring = await count('expiring');
      const expired = await count('expired');
      const lapsed = await count('lapsed');
      const none = await count('none');
      const debtors = await tx.member.count({ where: { ...base, balance: { gt: 0 } } });
      return { all, active, expiring, expired, lapsed, none, debtors };
    });
  }

  async get(auth: AccessPayload, id: string) {
    const opts = await this.settings(auth.gymId);
    const m = await this.tenant.run(auth.gymId, (tx) =>
      tx.member.findFirst({ where: { id, gymId: auth.gymId, ...(auth.role === 'OWNER' ? {} : { archivedAt: null }) } }),
    );
    if (!m) throw new NotFoundException('عضو پیدا نشد');
    return toMemberDto(m, todayInTehran(), opts);
  }

  async create(auth: AccessPayload, input: MemberFieldsInput) {
    const opts = await this.settings(auth.gymId);
    const today = todayInTehran();
    this.checkBirthDate(input.birthDate, today);
    const m = await this.tenant.run(auth.gymId, async (tx) => {
      const dup = await tx.member.findUnique({ where: { gymId_phone: { gymId: auth.gymId, phone: input.phone } } });
      if (dup) throw this.duplicate(dup);
      try {
        return await tx.member.create({
          data: {
            gymId: auth.gymId,
            name: input.name,
            phone: input.phone,
            birthDate: input.birthDate ? fromDateOnly(input.birthDate) : null,
            note: input.note || null,
          },
        });
      } catch (e) {
        if (isUniqueViolation(e)) throw new ConflictException({ message: 'این شماره قبلاً ثبت شده است', code: 'MEMBER_EXISTS' });
        throw e;
      }
    });
    return toMemberDto(m, today, opts);
  }

  async update(auth: AccessPayload, id: string, input: UpdateMemberInput) {
    const opts = await this.settings(auth.gymId);
    const today = todayInTehran();
    this.checkBirthDate(input.birthDate, today);
    const m = await this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.member.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('عضو پیدا نشد');
      if (cur.archivedAt) throw new ConflictException({ message: 'عضو بایگانی‌شده را ابتدا بازگردانید', code: 'MEMBER_ARCHIVED' });
      if (input.phone && input.phone !== cur.phone) {
        const dup = await tx.member.findUnique({ where: { gymId_phone: { gymId: auth.gymId, phone: input.phone } } });
        if (dup) throw this.duplicate(dup);
      }
      const data: { name?: string; phone?: string; birthDate?: Date | null; note?: string | null } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.birthDate !== undefined) data.birthDate = input.birthDate ? fromDateOnly(input.birthDate) : null;
      if (input.note !== undefined) data.note = input.note || null;
      try {
        return await tx.member.update({ where: { id }, data });
      } catch (e) {
        if (isUniqueViolation(e)) throw new ConflictException({ message: 'این شماره قبلاً ثبت شده است', code: 'MEMBER_EXISTS' });
        throw e;
      }
    });
    return toMemberDto(m, today, opts);
  }

  /** بایگانی به‌جای حذف: سوابق مالی می‌مانند و نشست‌های وب عضو باطل می‌شود */
  async archive(auth: AccessPayload, id: string, ip?: string) {
    const opts = await this.settings(auth.gymId);
    const m = await this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.member.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('عضو پیدا نشد');
      if (cur.archivedAt) return cur;
      const updated = await tx.member.update({ where: { id }, data: { archivedAt: new Date() } });
      await tx.refreshToken.updateMany({
        where: { subjectType: 'MEMBER', subjectId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await writeAudit(tx, { actorId: auth.sub, action: 'member.archive', target: `member:${id}`, ip });
      return updated;
    });
    return toMemberDto(m, todayInTehran(), opts);
  }

  async restore(auth: AccessPayload, id: string, ip?: string) {
    const opts = await this.settings(auth.gymId);
    const m = await this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.member.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('عضو پیدا نشد');
      if (!cur.archivedAt) return cur;
      const updated = await tx.member.update({ where: { id }, data: { archivedAt: null } });
      await writeAudit(tx, { actorId: auth.sub, action: 'member.restore', target: `member:${id}`, ip });
      return updated;
    });
    return toMemberDto(m, todayInTehran(), opts);
  }
}
