import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { PrismaService } from '../config/prisma.service';
import { MinioService } from '../common/services/minio.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [ListingsController],
  providers: [ListingsService, PrismaService, MinioService],
  exports: [ListingsService],
})
export class ListingsModule {}
