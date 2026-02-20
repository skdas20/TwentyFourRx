import { Module } from '@nestjs/common';
import { DeliveryRequestsController } from './delivery-requests.controller';
import { DeliveryRequestsService } from './delivery-requests.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { WatermarkService } from '../common/services/watermark.service';
import { SmsService } from '../common/services/sms.service';

@Module({
    controllers: [DeliveryRequestsController],
    providers: [DeliveryRequestsService, PrismaService, EmailService, GcsService, WatermarkService, SmsService],
    exports: [DeliveryRequestsService],
})
export class DeliveryRequestsModule { }
