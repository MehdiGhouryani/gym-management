import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { PaymentsService } from './payments.service';

const listQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type ListQuery = z.infer<typeof listQuerySchema>;

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.payments.list(auth, q);
  }
}
