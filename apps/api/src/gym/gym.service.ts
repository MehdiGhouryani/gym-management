import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { normalizePhone } from '@fulad/shared';
import type { CreateStaffInput, GymUpdateInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { toGymDto } from './gym.mapper';

const STAFF_SELECT = {
  id: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class GymService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  async get(gymId: string) {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId } });
    if (!g) throw new NotFoundException('باشگاه پیدا نشد');
    return toGymDto(g);
  }

  /** ویرایش مشخصات و آستانه‌های باشگاه (فقط مدیر) */
  async update(gymId: string, actorId: string, input: GymUpdateInput) {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId } });
    if (!g) throw new NotFoundException('باشگاه پیدا نشد');
    const data = {
      ...input,
      ...(input.phone !== undefined ? { phone: input.phone ? normalizePhone(input.phone) : null } : {}),
    };
    const updated = await this.prisma.gym.update({ where: { id: gymId }, data });
    await this.audit(gymId, actorId, 'gym.update', `gym:${gymId}`, { fields: Object.keys(input) });
    return toGymDto(updated);
  }

  /** کارکنان باشگاه: مدیر و پذیرش (بدون ادمین پلتفرم) */
  async listUsers(gymId: string) {
    const users = await this.prisma.user.findMany({
      where: { gymId, role: { in: [Role.OWNER, Role.STAFF] } },
      select: STAFF_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) };
  }

  async createStaff(gymId: string, actorId: string, input: CreateStaffInput) {
    const phone = normalizePhone(input.phone);
    const exists = await this.prisma.user.findUnique({ where: { phone } });
    if (exists) throw new ConflictException({ message: 'این شماره قبلاً ثبت شده است', code: 'USER_EXISTS' });
    const user = await this.prisma.user.create({
      data: { gymId, name: input.name, phone, role: Role.STAFF },
      select: STAFF_SELECT,
    });
    await this.audit(gymId, actorId, 'user.create', `user:${user.id}`, { name: user.name });
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  /** حذف پذیرش: نشست‌ها باطل و ردیف حذف می‌شود؛ مدیر قابل حذف نیست */
  async removeStaff(gymId: string, actorId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.gymId !== gymId) throw new NotFoundException('کاربر پیدا نشد');
    if (user.role === Role.OWNER) {
      throw new ConflictException({ message: 'مدیر باشگاه قابل حذف نیست', code: 'OWNER_IMMUTABLE' });
    }
    await this.prisma.refreshToken.updateMany({
      where: { subjectType: 'USER', subjectId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.user.delete({ where: { id: user.id } });
    await this.audit(gymId, actorId, 'user.remove', `user:${user.id}`, { name: user.name });
    return { ok: true };
  }

  private async audit(gymId: string, actorId: string, action: string, target: string, meta?: Prisma.InputJsonValue) {
    return this.tenant.run(gymId, (tx) => writeAudit(tx, { gymId, actorId, action, target, meta }));
  }
}
