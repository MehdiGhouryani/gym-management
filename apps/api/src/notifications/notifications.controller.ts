import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';

const listQuerySchema = z.object({
  status: z.enum(['QUEUED', 'SENT', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type ListQuery = z.infer<typeof listQuerySchema>;

@Controller('reminders')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  /** ردیابی تحویل یادآوری‌ها (فقط مدیر) */
  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.tenant.run(auth.gymId, async (tx) => {
      const where = { gymId: auth.gymId, ...(q.status ? { status: q.status } : {}) };
      const [rows, total] = await Promise.all([
        tx.reminder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          select: {
            id: true,
            template: true,
            status: true,
            attempts: true,
            error: true,
            sentAt: true,
            createdAt: true,
            member: { select: { id: true, name: true, phone: true } },
          },
        }),
        tx.reminder.count({ where }),
      ]);
      return {
        items: rows.map((r) => ({
          id: r.id,
          template: r.template,
          status: r.status,
          attempts: r.attempts,
          error: r.error,
          sentAt: r.sentAt ? r.sentAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          memberId: r.member.id,
          memberName: r.member.name,
          memberPhone: r.member.phone,
        })),
        total,
        page: q.page,
        limit: q.limit,
        pages: Math.max(1, Math.ceil(total / q.limit)),
      };
    });
  }
}
