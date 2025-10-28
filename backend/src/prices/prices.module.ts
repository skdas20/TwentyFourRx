import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { PrismaService } from '../config/prisma.service';

@Module({
  controllers: [PricesController],
  providers: [PricesService, PrismaService],
  exports: [PricesService],
})
export class PricesModule {}
