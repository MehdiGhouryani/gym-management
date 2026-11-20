import { Module } from '@nestjs/common';
import { BookingsController, ClassesController, CoachesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  controllers: [CoachesController, ClassesController, BookingsController],
  providers: [ClassesService],
})
export class ClassesModule {}
