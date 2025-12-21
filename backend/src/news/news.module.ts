import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { WatermarkService } from '../common/services/watermark.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService, PrismaService, GcsService, WatermarkService],
  exports: [NewsService],
})
export class NewsModule {}
