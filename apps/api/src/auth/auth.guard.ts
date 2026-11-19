import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { getSecrets } from '../config/secrets';
import { AccessPayload, verifyAccessToken } from './token';

export type AuthedRequest = Request & { auth: AccessPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      req.auth = verifyAccessToken(header.slice(7), getSecrets().jwt);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
