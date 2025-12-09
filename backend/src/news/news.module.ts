import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService, PrismaService, GcsService],
  exports: [NewsService],
})
export class NewsModule {}
