import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { PrismaService } from '../config/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PricesController],
  providers: [PricesService, PrismaService],
  exports: [PricesService],
})
export class PricesModule {}
