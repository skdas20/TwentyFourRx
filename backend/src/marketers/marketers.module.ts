import { Module } from '@nestjs/common';
import { MarketersController } from './marketers.controller';
import { MarketersService } from './marketers.service';
import { PrismaService } from '../config/prisma.service';

@Module({
  controllers: [MarketersController],
  providers: [MarketersService, PrismaService],
  exports: [MarketersService],
})
export class MarketersModule {}
