import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsPositive, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { BuyProposalsService } from './buy-proposals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class CreateBuyProposalDto {
  @IsString()
  listingId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  qty: number;

  @IsString()
  orderType: string; // "delivery", "intraday", "mtf"

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SendInvoiceDto {
  @IsString()
  listingId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  qty: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReviewProposalDto {
  @IsString()
  reviewerNote?: string;
}

@Controller('buy-proposals')
export class BuyProposalsController {
  constructor(private buyProposalsService: BuyProposalsService) {}

  @Post('send-invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADER', 'SELLER')
  async sendInvoice(
    @CurrentUser() user: any,
    @Body() dto: SendInvoiceDto,
  ) {
    return this.buyProposalsService.sendInvoice(
      user.sub,
      dto.listingId,
      dto.qty,
      dto.notes,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADER', 'SELLER')
  @UseInterceptors(FileInterceptor('receipt'))
  async createProposal(
    @CurrentUser() user: any,
    @Body() dto: CreateBuyProposalDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.buyProposalsService.createProposal(
      user.sub,
      dto.listingId,
      dto.qty,
      dto.orderType,
      receipt,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyProposals(@CurrentUser() user: any) {
    return this.buyProposalsService.getMyProposals(user.sub);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingProposals() {
    return this.buyProposalsService.getPendingProposals();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveProposal(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
  ) {
    return this.buyProposalsService.approveProposal(id, dto.reviewerNote);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectProposal(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
  ) {
    if (!dto.reviewerNote) {
      throw new Error('Reviewer note is required for rejection');
    }
    return this.buyProposalsService.rejectProposal(id, dto.reviewerNote);
  }

  @Post(':id/upload-receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADER', 'SELLER')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() receipt: Express.Multer.File,
  ) {
    if (!receipt) {
      throw new Error('Receipt file is required');
    }
    return this.buyProposalsService.uploadReceipt(id, user.sub, receipt);
  }
}
