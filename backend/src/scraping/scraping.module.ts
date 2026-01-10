import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { MedicineReferencesController } from './medicine-references.controller';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { WatermarkService } from '../common/services/watermark.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [ScrapingController, MedicineReferencesController],
  providers: [ScrapingService, PrismaService, GcsService, WatermarkService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
