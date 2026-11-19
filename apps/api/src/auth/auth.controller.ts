import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { otpRequestSchema, otpVerifySchema, refreshSchema } from '@fulad/shared';
import type { OtpRequestInput, OtpVerifyInput, RefreshInput } from '@fulad/shared';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentAuth } from './roles';
import type { AccessPayload } from './token';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestOtp(@Body(new ZodPipe(otpRequestSchema)) body: OtpRequestInput) {
    return this.auth.requestOtp(body);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body(new ZodPipe(otpVerifySchema)) body: OtpVerifyInput) {
    return this.auth.verifyOtp(body);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body(new ZodPipe(refreshSchema)) body: RefreshInput) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body(new ZodPipe(refreshSchema)) body: RefreshInput) {
    return this.auth.logout(body.refreshToken);
  }
}

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  me(@CurrentAuth() auth: AccessPayload) {
    return { type: auth.typ, role: auth.role ?? null, gymId: auth.gymId };
  }
}
