import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { MedicineReferencesController } from './medicine-references.controller';
import { PrismaService } from '../config/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ScrapingController, MedicineReferencesController],
  providers: [ScrapingService, PrismaService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
