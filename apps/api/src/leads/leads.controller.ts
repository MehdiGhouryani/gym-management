import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createLeadSchema, leadStatusSchema, updateLeadSchema } from '@fulad/shared';
import type { CreateLeadInput, UpdateLeadInput } from '@fulad/shared';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { LeadsService } from './leads.service';

const listQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type ListQuery = z.infer<typeof listQuerySchema>;

@Controller('leads')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.leads.list(auth, q);
  }

  @Post()
  create(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(createLeadSchema)) body: CreateLeadInput, @Ip() ip: string) {
    return this.leads.create(auth, body, ip);
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateLeadSchema)) body: UpdateLeadInput, @Ip() ip: string) {
    return this.leads.update(auth, id, body, ip);
  }

  @Post(':id/convert')
  convert(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string) {
    return this.leads.convert(auth, id, ip);
  }
}
