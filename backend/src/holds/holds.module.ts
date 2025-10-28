import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HoldsController } from './holds.controller';
import { HoldsService } from './holds.service';
import { HoldsWorker } from './holds.worker';
import { PrismaService } from '../config/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'holds',
    }),
  ],
  controllers: [HoldsController],
  providers: [HoldsService, HoldsWorker, PrismaService],
  exports: [HoldsService],
})
export class HoldsModule {}
