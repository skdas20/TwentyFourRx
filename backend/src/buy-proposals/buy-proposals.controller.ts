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
import { IsString, IsPositive, IsInt, IsOptional, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BuyProposalsService } from './buy-proposals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApprovedUserGuard } from '../common/guards/approved-user.guard';
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

export class SellerConfirmProposalDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  confirmedQty: number;

  @IsString()
  batchNo: string;

  @IsDateString()
  expiryDate: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BuyerRejectQtyDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

@Controller('buy-proposals')
export class BuyProposalsController {
  constructor(private buyProposalsService: BuyProposalsService) {}

  @Post('send-invoice')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('TRADER', 'SELLER')
  @UseInterceptors(FileInterceptor('receipt'))
  async createProposal(
    @CurrentUser() user: any,
    @Body() dto: CreateBuyProposalDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    // All new proposals use seller confirmation flow
    return this.buyProposalsService.createProposalWithSellerFlow(
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getProposal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.buyProposalsService.getProposalById(id, user.sub);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('invoice'))
  async approveProposal(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
    @UploadedFile() invoice?: Express.Multer.File,
  ) {
    return this.buyProposalsService.approveProposal(id, dto.reviewerNote, invoice);
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
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
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

  @Post(':id/seller-invoice')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileInterceptor('invoice'))
  async uploadSellerInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() invoice: Express.Multer.File,
  ) {
    if (!invoice) {
      throw new Error('Invoice file is required');
    }
    return this.buyProposalsService.uploadSellerInvoice(id, user.sub, invoice);
  }

  // NEW: Seller confirms proposal
  @Patch(':id/seller-confirm')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('SELLER', 'TRADER')
  async sellerConfirmProposal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SellerConfirmProposalDto,
  ) {
    return this.buyProposalsService.confirmProposalBySeller(
      id,
      user.sub,
      dto.confirmedQty,
      dto.batchNo,
      new Date(dto.expiryDate),
      dto.note,
    );
  }

  // NEW: Buyer approves modified quantity
  @Patch(':id/buyer-approve-qty')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('TRADER', 'SELLER')
  async buyerApproveModifiedQty(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.buyProposalsService.buyerApproveModifiedQty(id, user.sub);
  }

  // NEW: Buyer rejects modified quantity
  @Patch(':id/buyer-reject-qty')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('TRADER', 'SELLER')
  async buyerRejectModifiedQty(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: BuyerRejectQtyDto,
  ) {
    return this.buyProposalsService.buyerRejectModifiedQty(id, user.sub, dto.reason);
  }

  // NEW: Get seller's pending proposals
  @Get('seller/pending')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedUserGuard)
  @Roles('SELLER', 'TRADER')
  async getSellerPendingProposals(@CurrentUser() user: any) {
    return this.buyProposalsService.getSellerPendingProposals(user.sub);
  }
}
