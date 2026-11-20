import { Controller, Get, Header, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { toCsv } from '../common/csv';
import { ZodPipe } from '../common/zod.pipe';
import { PaymentsService } from './payments.service';

const exportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().max(80).optional(),
});

const listQuerySchema = exportQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type ListQuery = z.infer<typeof listQuerySchema>;
type ExportQuery = z.infer<typeof exportQuerySchema>;

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.payments.list(auth, q);
  }

  /** خروجی CSV پرداخت‌ها با همان فیلتر فهرست */
  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  async exportCsv(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(exportQuerySchema)) q: ExportQuery, @Res({ passthrough: true }) res: Response) {
    const rows = await this.payments.exportCsv(auth, q);
    res.setHeader('content-disposition', `attachment; filename="payments.csv"`);
    return toCsv(['name', 'phone', 'amount', 'method', 'paidAt'], rows);
  }
}
