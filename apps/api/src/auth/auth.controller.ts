import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { otpRequestSchema, otpVerifySchema, refreshSchema } from '@fulad/shared';
import type { OtpRequestInput, OtpVerifyInput } from '@fulad/shared';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentAuth } from './roles';
import { REFRESH_COOKIE, refreshCookieOptions, wantsCookieSession } from './cookie';
import type { AccessPayload } from './token';

const isProd = process.env.NODE_ENV === 'production';
// بدنه‌ی refresh اختیاری است: وب توکن را از کوکی می‌گیرد، اپ از بدنه
const refreshBody = new ZodPipe(refreshSchema.optional());

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
  async verifyOtp(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodPipe(otpVerifySchema)) body: OtpVerifyInput,
  ) {
    const out = await this.auth.verifyOtp(body);
    // وب: refresh token در کوکی HttpOnly و هرگز در بدنه؛ اپ: توکن در بدنه
    if (wantsCookieSession(req)) {
      res.cookie(REFRESH_COOKIE, out.refreshToken, refreshCookieOptions(isProd));
      const { refreshToken: _omit, ...web } = out;
      return web;
    }
    return out;
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(refreshBody) body?: { refreshToken?: string },
  ) {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const token = body?.refreshToken ?? cookieToken;
    if (!token) throw new UnauthorizedException('توکن تمدید پیدا نشد');
    const out = await this.auth.refresh(token);
    if (!body?.refreshToken && cookieToken) {
      // چرخش از مسیر کوکی: کوکی جدید جایگزین می‌شود و توکن در بدنه نمی‌آید
      res.cookie(REFRESH_COOKIE, out.refreshToken, refreshCookieOptions(isProd));
      const { refreshToken: _omit, ...web } = out;
      return web;
    }
    return out;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(refreshBody) body?: { refreshToken?: string },
  ) {
    const token = body?.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(isProd));
    return this.auth.logout(token);
  }
}

@UseGuards(AuthGuard)
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload) {
    return this.auth.listSessions(auth);
  }

  @Delete(':id')
  @HttpCode(200)
  revoke(@CurrentAuth() auth: AccessPayload, @Param('id') id: string) {
    return this.auth.revokeSession(auth, id);
  }

  @Delete()
  @HttpCode(200)
  revokeAll(@CurrentAuth() auth: AccessPayload) {
    return this.auth.revokeAllSessions(auth);
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
