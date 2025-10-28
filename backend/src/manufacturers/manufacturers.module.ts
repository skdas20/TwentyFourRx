import { Module } from '@nestjs/common';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';
import { PrismaService } from '../config/prisma.service';

@Module({
  controllers: [ManufacturersController],
  providers: [ManufacturersService, PrismaService],
  exports: [ManufacturersService],
})
export class ManufacturersModule {}
