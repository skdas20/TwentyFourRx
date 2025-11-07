import { Module } from '@nestjs/common';
import { PriceAlertsController } from './price-alerts.controller';
import { PriceAlertsService } from './price-alerts.service';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService, PrismaService, NotificationsService],
  exports: [PriceAlertsService],
})
export class PriceAlertsModule {}
