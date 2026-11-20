import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizePhone } from '@fulad/shared';
import type { PublicLeadInput } from '@fulad/shared';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';

/** سطح عمومی: بدون احراز هویت؛ فقط باشگاه فعال و پاسخ‌های ضدافشا */
@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  /** صفحه‌ی عمومی باشگاه: معرفی، پلن‌ها و جلسه‌های پیشِ‌روی کلاس‌ها */
  async gymProfile(slug: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, name: true, city: true, address: true, phone: true },
    });
    if (!gym) throw new NotFoundException('باشگاه پیدا نشد');
    const plans = await this.tenant.run(gym.id, (tx) =>
      tx.plan.findMany({ where: { gymId: gym.id, active: true }, orderBy: { days: 'asc' }, select: { name: true, days: true, price: true } }),
    );
    const now = new Date();
    const sessions = await this.tenant.run(gym.id, (tx) =>
      tx.classSession.findMany({
        where: { gymId: gym.id, startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        take: 10,
        select: { id: true, startsAt: true, class: { select: { name: true, coach: { select: { name: true } } } } },
      }),
    );
    return {
      slug,
      name: gym.name,
      city: gym.city,
      address: gym.address,
      phone: gym.phone,
      plans: plans.map((p) => ({ name: p.name, days: p.days, price: p.price })),
      sessions: sessions.map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        className: s.class.name,
        coachName: s.class.coach?.name ?? null,
      })),
    };
  }

  /** ثبت درخواست عضویت از سایت → سرنخ NEW؛ پاسخ همیشه یکسان تا عضو بودن فاش نشود */
  async joinRequest(slug: string, input: PublicLeadInput) {
    const gym = await this.prisma.gym.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
    if (!gym) throw new NotFoundException('باشگاه پیدا نشد');
    const phone = normalizePhone(input.phone);
    if (!/^09\d{9}$/.test(phone)) throw new BadRequestException('شماره موبایل نامعتبر است');
    const ok = { ok: true as const };
    try {
      await this.tenant.run(gym.id, async (tx) => {
        const member = await tx.member.findFirst({ where: { gymId: gym.id, phone }, select: { id: true } });
        if (member) return ok; // پاسخ یکسان
        const existing = await tx.lead.findUnique({ where: { gymId_phone: { gymId: gym.id, phone } } });
        if (existing) {
          await tx.lead.update({ where: { id: existing.id }, data: { note: input.note ?? existing.note } });
          return ok;
        }
        await tx.lead.create({
          data: { gymId: gym.id, name: input.name, phone, source: 'سایت', note: input.note ?? null },
        });
        return ok;
      });
      return ok;
    } catch (e) {
      if (e instanceof ConflictException) return ok;
      throw e;
    }
  }
}
