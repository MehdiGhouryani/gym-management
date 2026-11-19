import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { payDebtSchema, renewSchema } from '@fulad/shared';
import type { PayDebtInput, RenewInput } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { SubscriptionsService } from './subscriptions.service';

@Controller('members/:id')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('subscriptions')
  history(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.subs.history(auth, id);
  }

  @Post('subscriptions')
  renew(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(renewSchema)) body: RenewInput,
    @Ip() ip: string,
  ) {
    return this.subs.renew(auth, id, body, ip);
  }

  @Post('payments')
  payDebt(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(payDebtSchema)) body: PayDebtInput,
    @Ip() ip: string,
  ) {
    return this.subs.payDebt(auth, id, body, ip);
  }
}
