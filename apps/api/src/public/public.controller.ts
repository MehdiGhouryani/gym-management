import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { publicLeadSchema } from '@fulad/shared';
import type { PublicLeadInput } from '@fulad/shared';
import { ZodPipe } from '../common/zod.pipe';
import { PublicService } from './public.service';

/** مسیرهای کاملاً عمومی (بدون توکن)؛ محدودیت نرخ سخت‌گیرانه */
@Controller('public/gyms')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':slug')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  profile(@Param('slug') slug: string) {
    return this.publicService.gymProfile(slug);
  }

  @Post(':slug/join')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  join(@Param('slug') slug: string, @Body(new ZodPipe(publicLeadSchema)) body: PublicLeadInput) {
    return this.publicService.joinRequest(slug, body);
  }
}
