import { Module } from '@nestjs/common';
import { BuyProposalsController } from './buy-proposals.controller';
import { BuyProposalsService } from './buy-proposals.service';
import { PrismaService } from '../config/prisma.service';
import { MinioService } from '../common/services/minio.service';

@Module({
  controllers: [BuyProposalsController],
  providers: [BuyProposalsService, PrismaService, MinioService],
  exports: [BuyProposalsService],
})
export class BuyProposalsModule {}
