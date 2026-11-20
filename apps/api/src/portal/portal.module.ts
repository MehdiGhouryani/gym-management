import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { MemberGuard } from './member.guard';

@Module({ controllers: [PortalController], providers: [MemberGuard] })
export class PortalModule {}
