import { Module } from '@nestjs/common';
import { DeliveryRequestsController } from './delivery-requests.controller';
import { DeliveryRequestsService } from './delivery-requests.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { WatermarkService } from '../common/services/watermark.service';
import { SmsService } from '../common/services/sms.service';
import { PdfService } from '../common/services/pdf.service';

@Module({
    controllers: [DeliveryRequestsController],
    providers: [DeliveryRequestsService, PrismaService, EmailService, GcsService, WatermarkService, SmsService, PdfService],
    exports: [DeliveryRequestsService],
})
export class DeliveryRequestsModule { }
