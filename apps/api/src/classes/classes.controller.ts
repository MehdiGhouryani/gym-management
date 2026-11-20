import { BadRequestException, Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  bookingStatusSchema, createClassSchema, createCoachSchema, createSessionSchema, updateClassSchema, updateCoachSchema,
} from '@fulad/shared';
import type { CreateClassInput, CreateCoachInput, CreateSessionInput, UpdateClassInput, UpdateCoachInput } from '@fulad/shared';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { ClassesService } from './classes.service';

const bookingUpdateSchema = z.object({ status: bookingStatusSchema });
type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
const memberRefSchema = z.object({ memberId: z.uuid() });

@Controller('coaches')
@UseGuards(AuthGuard, RolesGuard)
export class CoachesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Roles('OWNER', 'STAFF')
  list(@CurrentAuth() auth: AccessPayload) {
    return this.classes.listCoaches(auth);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(createCoachSchema)) body: CreateCoachInput, @Ip() ip: string) {
    return this.classes.createCoach(auth, body, ip);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateCoachSchema)) body: UpdateCoachInput, @Ip() ip: string) {
    return this.classes.updateCoach(auth, id, body, ip);
  }
}

@Controller('classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list(@CurrentAuth() auth: AccessPayload) {
    return this.classes.listClasses(auth);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(createClassSchema)) body: CreateClassInput, @Ip() ip: string) {
    return this.classes.createClass(auth, body, ip);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateClassSchema)) body: UpdateClassInput, @Ip() ip: string) {
    return this.classes.updateClass(auth, id, body, ip);
  }

  @Post(':id/sessions')
  @Roles('OWNER')
  addSession(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(createSessionSchema)) body: CreateSessionInput, @Ip() ip: string) {
    return this.classes.addSession(auth, id, body, ip);
  }

  @Get(':id/sessions')
  sessions(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.listSessions(auth, id);
  }

  @Get(':id/bookings')
  sessionBookings(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.listSessionBookings(auth, id);
  }

  @Post(':id/bookings')
  book(@CurrentAuth() auth: AccessPayload, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(memberRefSchema)) body: { memberId: string }, @Ip() ip: string) {
    return this.classes.book(auth, id, body.memberId, ip);
  }
}

@Controller('bookings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class BookingsController {
  constructor(private readonly classes: ClassesService) {}

  @Patch(':id')
  updateBooking(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(bookingUpdateSchema)) body: BookingUpdateInput,
    @Ip() ip: string,
  ) {
    if (body.status === 'BOOKED') throw new BadRequestException('برای رزرو، مسیر POST /classes/{id}/bookings را استفاده کنید');
    return this.classes.updateBooking(auth, id, body.status as 'CANCELLED' | 'ATTENDED', ip);
  }
}
