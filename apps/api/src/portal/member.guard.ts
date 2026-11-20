import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthedRequest } from '../auth/auth.guard';

/** فقط توکن‌های عضو وب (typ: member) از این دروازه عبور می‌کنند */
@Injectable()
export class MemberGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (req.auth.typ !== 'member') throw new ForbiddenException('این مسیر مخصوص اعضاست');
    return true;
  }
}
