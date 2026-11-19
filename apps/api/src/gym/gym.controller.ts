import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { GymService } from './gym.service';

/** باشگاه خودِ کاربر (از روی توکن)؛ نام و آستانه‌های وضعیت برای اپ */
@Controller('gym')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class GymController {
  constructor(private readonly gym: GymService) {}

  @Get()
  get(@CurrentAuth() auth: AccessPayload) {
    return this.gym.get(auth.gymId);
  }
}
