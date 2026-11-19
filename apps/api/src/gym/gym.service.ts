import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { toGymDto } from './gym.mapper';

@Injectable()
export class GymService {
  constructor(private readonly prisma: PrismaService) {}

  async get(gymId: string) {
    const g = await this.prisma.gym.findUnique({ where: { id: gymId } });
    if (!g) throw new NotFoundException('باشگاه پیدا نشد');
    return toGymDto(g);
  }
}
