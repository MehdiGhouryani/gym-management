import { Body, Controller, Get, Header, HttpCode, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { listMembersQuerySchema, memberFieldsSchema, updateMemberSchema } from '@fulad/shared';
import type { ListMembersQuery, MemberFieldsInput, UpdateMemberInput } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { toCsv } from '../common/csv';
import type { Response } from 'express';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listMembersQuerySchema)) q: ListMembersQuery) {
    return this.members.list(auth, q);
  }

  // باید قبل از ':id' بیاید
  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  async exportCsv(@CurrentAuth() auth: AccessPayload, @Query(new ZodPipe(listMembersQuerySchema)) q: ListMembersQuery, @Res({ passthrough: true }) res: Response) {
    const rows = await this.members.exportRows(auth, q);
    res.setHeader('content-disposition', 'attachment; filename="members.csv"');
    return toCsv(['name', 'phone', 'status', 'currentEndsOn', 'balance', 'createdAt'], rows);
  }

  @Get('counts')
  counts(@CurrentAuth() auth: AccessPayload) {
    return this.members.counts(auth);
  }

  @Post()
  create(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(memberFieldsSchema)) body: MemberFieldsInput) {
    return this.members.create(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.members.get(auth, id);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateMemberSchema)) body: UpdateMemberInput,
  ) {
    return this.members.update(auth, id, body);
  }

  @Get(':id/timeline')
  @Roles('OWNER')
  timeline(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.members.timeline(auth, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @Roles('OWNER')
  archive(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string) {
    return this.members.archive(auth, id, ip);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @Roles('OWNER')
  restore(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string) {
    return this.members.restore(auth, id, ip);
  }
}
