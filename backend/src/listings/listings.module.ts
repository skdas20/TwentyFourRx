import { Module, forwardRef } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { ConfigModule } from '@nestjs/config';
import { WatermarkService } from '../common/services/watermark.service';
import { PricesModule } from '../prices/prices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, forwardRef(() => PricesModule), NotificationsModule],
  controllers: [ListingsController],
  providers: [ListingsService, PrismaService, GcsService, WatermarkService],
  exports: [ListingsService],
})
export class ListingsModule {}
