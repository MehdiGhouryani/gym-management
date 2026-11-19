import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { freezeSchema, payDebtSchema, renewSchema } from '@fulad/shared';
import type { FreezeInput, PayDebtInput, RenewInput } from '@fulad/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { SubscriptionsService } from './subscriptions.service';

/** کلید اختیاری درخواست‌های مالی؛ حداکثر ۲۰۰ نویسه */
const idempotencyKeyOf = (raw?: string): string | undefined => {
  const v = raw?.trim();
  return v && v.length <= 200 ? v : undefined;
};

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
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subs.renew(auth, id, body, ip, idempotencyKeyOf(idempotencyKey));
  }

  @Post('payments')
  payDebt(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(payDebtSchema)) body: PayDebtInput,
    @Ip() ip: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subs.payDebt(auth, id, body, ip, idempotencyKeyOf(idempotencyKey));
  }

  @Post('subscriptions/:subId/freeze')
  @Roles('OWNER')
  freeze(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('subId', ParseUUIDPipe) subId: string,
    @Body(new ZodPipe(freezeSchema)) body: FreezeInput,
    @Ip() ip: string,
  ) {
    return this.subs.freeze(auth, id, subId, body, ip);
  }

  @Post('subscriptions/:subId/cancel')
  @Roles('OWNER')
  cancel(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('subId', ParseUUIDPipe) subId: string,
    @Ip() ip: string,
  ) {
    return this.subs.cancel(auth, id, subId, ip);
  }
}
