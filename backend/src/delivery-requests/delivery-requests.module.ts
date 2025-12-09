import { Module } from '@nestjs/common';
import { DeliveryRequestsController } from './delivery-requests.controller';
import { DeliveryRequestsService } from './delivery-requests.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';

@Module({
    controllers: [DeliveryRequestsController],
    providers: [DeliveryRequestsService, PrismaService, EmailService],
    exports: [DeliveryRequestsService],
})
export class DeliveryRequestsModule { }
