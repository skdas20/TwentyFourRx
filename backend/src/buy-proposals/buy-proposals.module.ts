import { Module } from '@nestjs/common';
import { BuyProposalsController } from './buy-proposals.controller';
import { BuyProposalsService } from './buy-proposals.service';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';

@Module({
  controllers: [BuyProposalsController],
  providers: [BuyProposalsService, PrismaService, GcsService],
  exports: [BuyProposalsService],
})
export class BuyProposalsModule {}
