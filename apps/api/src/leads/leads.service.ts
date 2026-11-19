import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizePhone } from '@fulad/shared';
import { canTransitionLead } from '@fulad/shared';
import type { CreateLeadInput, UpdateLeadInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import { TenantService } from '../tenant/tenant.service';
import { PrismaService } from '../prisma.service';
import type { AccessPayload } from '../auth/token';

const PAGE_DEFAULT = 30;
const PAGE_MAX = 100;

@Injectable()
export class LeadsService {
  constructor(
    private readonly tenant: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  async list(auth: AccessPayload, q: { status?: string; q?: string; page?: number; limit?: number }) {
    const page = q.page ?? 1;
    const limit = Math.min(PAGE_MAX, q.limit ?? PAGE_DEFAULT);
    return this.tenant.run(auth.gymId, async (tx) => {
      const where = {
        gymId: auth.gymId,
        ...(q.status ? { status: q.status as never } : {}),
        ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' as const } }, { phone: { contains: q.q } }] } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.lead.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: { member: { select: { id: true, name: true } } },
        }),
        tx.lead.count({ where }),
      ]);
      return {
        items: rows.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          status: l.status,
          source: l.source,
          note: l.note,
          memberId: l.member?.id ?? null,
          memberName: l.member?.name ?? null,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      };
    });
  }

  async create(auth: AccessPayload, input: CreateLeadInput, ip?: string) {
    const phone = normalizePhone(input.phone);
    return this.tenant.run(auth.gymId, async (tx) => {
      const dup = await tx.lead.findUnique({ where: { gymId_phone: { gymId: auth.gymId, phone } } });
      if (dup) throw new ConflictException({ message: 'سرنخی با این شماره وجود دارد', code: 'LEAD_EXISTS', existingLeadId: dup.id });
      // اگر همین شماره عضو است، سرنخ بی‌معناست
      const member = await tx.member.findFirst({ where: { gymId: auth.gymId, phone }, select: { id: true } });
      if (member) throw new ConflictException({ message: 'این شماره همین حالا عضو است', code: 'ALREADY_MEMBER', existingMemberId: member.id });
      const created = await tx.lead.create({
        data: { gymId: auth.gymId, name: input.name, phone, source: input.source ?? null, note: input.note ?? null },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'lead.create', target: `lead:${created.id}`, meta: { name: input.name }, ip });
      return this.dto(created);
    });
  }

  async update(auth: AccessPayload, id: string, input: UpdateLeadInput, ip?: string) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.lead.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('سرنخ پیدا نشد');
      if (input.status && !canTransitionLead(cur.status, input.status)) {
        throw new BadRequestException({
          message: `گذار ${cur.status} به ${input.status} مجاز نیست`,
          code: 'LEAD_TRANSITION',
        });
      }
      const updated = await tx.lead.update({
        where: { id },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'lead.update', target: `lead:${id}`, meta: { ...input }, ip });
      return this.dto(updated);
    });
  }

  /** تبدیل سرنخ به عضو: عضو با نام و شماره ساخته می‌شود؛ اشتراک جدا ثبت می‌شود */
  async convert(auth: AccessPayload, id: string, ip?: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.tenant.run(auth.gymId, async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id, gymId: auth.gymId } });
      if (!lead) throw new NotFoundException('سرنخ پیدا نشد');
      if (lead.status !== 'TRIAL') throw new ConflictException({ message: 'اول سرنخ را به مرحله‌ی آزمایش برسانید', code: 'LEAD_NOT_TRIAL' });
      if (lead.memberId) throw new ConflictException({ message: 'این سرنخ قبلاً تبدیل شده است', code: 'LEAD_CONVERTED' });
      const dup = await tx.member.findFirst({ where: { gymId: auth.gymId, phone: lead.phone } });
      if (dup) throw new ConflictException({ message: 'این شماره همین حالا عضو است', code: 'ALREADY_MEMBER', existingMemberId: dup.id });
      const member = await tx.member.create({ data: { gymId: auth.gymId, name: lead.name, phone: lead.phone } });
      await tx.lead.update({ where: { id }, data: { status: 'CONVERTED', memberId: member.id } });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'lead.convert', target: `lead:${id}`, meta: { memberId: member.id }, ip });
      void today;
      return { memberId: member.id, lead: this.dto({ ...lead, status: 'CONVERTED', memberId: member.id }) };
    });
  }

  private dto(l: { id: string; name: string; phone: string; status: string; source: string | null; note: string | null; memberId: string | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      source: l.source,
      note: l.note,
      memberId: l.memberId,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }
}
