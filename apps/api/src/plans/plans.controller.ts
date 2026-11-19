import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createPlanSchema, listPlansQuerySchema, updatePlanSchema } from '@fulad/shared';
import type { CreatePlanInput, ListPlansQuery, UpdatePlanInput } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { PlansService } from './plans.service';

@Controller('plans')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listPlansQuerySchema)) q: ListPlansQuery) {
    return this.plans.list(auth, q.includeInactive ?? false);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(createPlanSchema)) body: CreatePlanInput, @Ip() ip: string) {
    return this.plans.create(auth, body, ip);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updatePlanSchema)) body: UpdatePlanInput,
    @Ip() ip: string,
  ) {
    return this.plans.update(auth, id, body, ip);
  }
}
