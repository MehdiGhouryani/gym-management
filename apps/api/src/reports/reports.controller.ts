import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { annualReportQuerySchema, monthlyReportQuerySchema } from '@fulad/shared';
import type { AnnualReportQuery, MonthlyReportQuery } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { ReportsService } from './reports.service';

/** گزارش مالی فقط برای مدیر باشگاه است (پذیرش دسترسی ندارد) */
@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('monthly')
  monthly(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(monthlyReportQuerySchema)) q: MonthlyReportQuery) {
    return this.reports.monthly(auth, q);
  }

  @Get('annual')
  annual(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(annualReportQuerySchema)) q: AnnualReportQuery) {
    return this.reports.annual(auth, q.year);
  }

  @Get('plans')
  planStats(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(monthlyReportQuerySchema)) q: MonthlyReportQuery) {
    return this.reports.planStats(auth, q.year, q.month);
  }

  @Get('staff')
  staffStats(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(monthlyReportQuerySchema)) q: MonthlyReportQuery) {
    return this.reports.staffStats(auth, q.year, q.month);
  }
}
