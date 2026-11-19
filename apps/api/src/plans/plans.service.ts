import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePlanInput, UpdatePlanInput } from '@fulad/shared';
import { writeAudit } from '../audit/audit';
import type { AccessPayload } from '../auth/token';
import { TenantService } from '../tenant/tenant.service';
import { toPlanDto } from './plan.mapper';

const duplicate = () => new ConflictException({ message: 'پلنی با این نام وجود دارد', code: 'PLAN_EXISTS' });

@Injectable()
export class PlansService {
  constructor(private readonly tenant: TenantService) {}

  /** پذیرش فقط پلن‌های فعال را می‌بیند (برای فرم ثبت اشتراک) */
  async list(auth: AccessPayload, includeInactive: boolean) {
    if (includeInactive && auth.role !== 'OWNER') throw new ForbiddenException('فقط مدیر باشگاه پلن‌های غیرفعال را می‌بیند');
    const rows = await this.tenant.run(auth.gymId, (tx) =>
      tx.plan.findMany({
        where: { gymId: auth.gymId, ...(includeInactive ? {} : { active: true }) },
        orderBy: [{ days: 'asc' }, { price: 'asc' }, { name: 'asc' }],
      }),
    );
    return rows.map(toPlanDto);
  }

  async create(auth: AccessPayload, input: CreatePlanInput, ip?: string) {
    const plan = await this.tenant.run(auth.gymId, async (tx) => {
      const dup = await tx.plan.findFirst({ where: { gymId: auth.gymId, name: { equals: input.name, mode: 'insensitive' } } });
      if (dup) throw duplicate();
      const created = await tx.plan.create({ data: { gymId: auth.gymId, name: input.name, days: input.days, price: input.price } });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'plan.create', target: `plan:${created.id}`, meta: { ...input }, ip });
      return created;
    });
    return toPlanDto(plan);
  }

  /** پلن حذف نمی‌شود؛ پلنی که دیگر فروخته نمی‌شود غیرفعال می‌شود. اشتراک‌های قبلی قیمت و تاریخ خودشان را نگه می‌دارند. */
  async update(auth: AccessPayload, id: string, input: UpdatePlanInput, ip?: string) {
    const plan = await this.tenant.run(auth.gymId, async (tx) => {
      const cur = await tx.plan.findFirst({ where: { id, gymId: auth.gymId } });
      if (!cur) throw new NotFoundException('پلن پیدا نشد');
      if (input.name !== undefined) {
        const dup = await tx.plan.findFirst({
          where: { gymId: auth.gymId, id: { not: id }, name: { equals: input.name, mode: 'insensitive' } },
        });
        if (dup) throw duplicate();
      }
      const data: { name?: string; days?: number; price?: number; active?: boolean } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.days !== undefined) data.days = input.days;
      if (input.price !== undefined) data.price = input.price;
      if (input.active !== undefined) data.active = input.active;
      const updated = await tx.plan.update({ where: { id }, data });
      await writeAudit(tx, { gymId: auth.gymId, actorId: auth.sub, action: 'plan.update', target: `plan:${id}`, meta: { ...data }, ip });
      return updated;
    });
    return toPlanDto(plan);
  }
}
