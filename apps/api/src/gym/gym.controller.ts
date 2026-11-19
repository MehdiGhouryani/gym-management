import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { gymUpdateSchema, createStaffSchema } from '@fulad/shared';
import type { CreateStaffInput, GymUpdateInput } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { GymService } from './gym.service';

/** باشگاه خودِ کاربر (از روی توکن). ویرایش و کارکنان فقط مدیر. */
@Controller('gym')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class GymController {
  constructor(private readonly gym: GymService) {}

  @Get()
  get(@CurrentAuth() auth: AccessPayload) {
    return this.gym.get(auth.gymId);
  }

  @Patch()
  update(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(gymUpdateSchema)) body: GymUpdateInput) {
    return this.gym.update(auth.gymId, auth.sub, body);
  }

  @Get('users')
  @Roles('OWNER')
  listUsers(@CurrentAuth() auth: AccessPayload) {
    return this.gym.listUsers(auth.gymId);
  }

  @Post('users')
  @Roles('OWNER')
  createStaff(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(createStaffSchema)) body: CreateStaffInput) {
    return this.gym.createStaff(auth.gymId, auth.sub, body);
  }

  @Delete('users/:id')
  @Roles('OWNER')
  removeStaff(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.gym.removeStaff(auth.gymId, auth.sub, id);
  }
}
