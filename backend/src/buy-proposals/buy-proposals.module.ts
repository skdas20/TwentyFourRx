import { Module } from '@nestjs/common';
import { BuyProposalsController } from './buy-proposals.controller';
import { BuyProposalsService } from './buy-proposals.service';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { EmailService } from '../common/services/email.service';
import { WatermarkService } from '../common/services/watermark.service';

@Module({
  controllers: [BuyProposalsController],
  providers: [BuyProposalsService, PrismaService, GcsService, EmailService, WatermarkService],
  exports: [BuyProposalsService],
})
export class BuyProposalsModule { }
