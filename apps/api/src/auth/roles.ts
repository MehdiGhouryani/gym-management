import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessPayload } from './token';
import type { AuthedRequest } from './auth.guard';

type AppRole = 'OWNER' | 'STAFF';
const KEY = 'roles';

/** فقط کاربران اپ با این نقش‌ها (مدیر یا پذیرش). عضو وب هرگز عبور نمی‌کند. */
export const Roles = (...roles: AppRole[]) => SetMetadata(KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[] | undefined>(KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
    if (auth.typ !== 'user' || !auth.role || !roles.includes(auth.role)) throw new ForbiddenException('دسترسی ندارید');
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessPayload => ctx.switchToHttp().getRequest<AuthedRequest>().auth,
);
