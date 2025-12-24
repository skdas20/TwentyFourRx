import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
