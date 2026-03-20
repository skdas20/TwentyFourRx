import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsNumber, IsPositive, IsInt, IsOptional, Min, Max, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApprovedUserGuard } from '../common/guards/approved-user.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

export class ApproveBulkListingDto {
  @IsArray()
  selectedIndices: number[];

  @IsString()
  markupType: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  markupValue: number;
}

export class CreateListingDto {
  @IsString()
  medicineReferenceId: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  @IsOptional()
  proposedMrp?: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  basePrice: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  stock: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercentage: number; // GST percentage: 0 or 5

  @IsString()
  @IsOptional()
  batchNo?: string; // Batch number for admin verification

  @IsString()
  @IsOptional()
  expiryDate?: string; // Expiry date (YYYY-MM-DD format) for admin verification
}

export class ApproveListingDto {
  @IsString()
  @IsOptional()
  markupType?: 'PERCENTAGE' | 'FIXED';

  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseFloat(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  adminMarkupPct?: number;

  @IsString()
  @IsOptional()
  reviewerNote?: string;
}

export class UpdateMarkupDto {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  adminMarkupPct: number;

  @IsString()
  @IsOptional()
  markupType?: 'PERCENTAGE' | 'FIXED';
}

export class RejectListingDto {
  @IsString()
  reviewerNote: string;
}

export class UpdateListingDto {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  @IsOptional()
  basePrice?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  @IsOptional()
  stock?: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  gstPercentage?: number;
}

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  // SELLER/TRADER: Create new listing (from medicine_references)
  // Both can create listings - same permissions
  // Note: Pending users CAN create listings, but cannot BUY medicines
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'document', maxCount: 1 },
    { name: 'productImage', maxCount: 1 },
  ]))
  async createListing(
    @CurrentUser() user: any,
    @Body() dto: CreateListingDto,
    @UploadedFiles() files?: { document?: Express.Multer.File[], productImage?: Express.Multer.File[] },
  ) {
    const document = files?.document?.[0];
    const productImage = files?.productImage?.[0];
    
    console.log('📥 Received listing creation request:', {
      userId: user.sub,
      medicineReferenceId: dto.medicineReferenceId,
      proposedMrp: dto.proposedMrp,
      basePrice: dto.basePrice,
      stock: dto.stock,
      gstPercentage: dto.gstPercentage,
      batchNo: dto.batchNo,
      expiryDate: dto.expiryDate,
      hasDocument: !!document,
      hasProductImage: !!productImage,
      documentName: document?.originalname,
      productImageName: productImage?.originalname,
    });

    return this.listingsService.createListing(
      user.sub,
      dto.medicineReferenceId,
      dto.basePrice,
      dto.stock,
      document,
      dto.proposedMrp,
      productImage,
      dto.batchNo,
      dto.expiryDate,
      dto.gstPercentage,
    );
  }

  // SELLER/TRADER: Get my listings
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  async getMyListings(@CurrentUser() user: any) {
    return this.listingsService.getListingsBySeller(user.sub);
  }

  // SELLER/TRADER: Create bulk listing request
  // Note: Pending users CAN create bulk listings, but cannot BUY medicines
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'csv', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]))
  async createBulkListing(
    @CurrentUser() user: any,
    @UploadedFiles() files: { csv?: Express.Multer.File[], document?: Express.Multer.File[] },
  ) {
    if (!files.csv?.[0]) {
      throw new BadRequestException('CSV file is required');
    }
    return this.listingsService.createBulkListingRequest(
      user.sub,
      files.csv[0],
      files.document?.[0],
    );
  }

  // SELLER: Get my bulk listing requests
  @Get('bulk/my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyBulkListingRequests(@CurrentUser() user: any) {
    return this.listingsService.getMyBulkListingRequests(user.sub);
  }

  // ADMIN: Get bulk listing requests
  @Get('bulk/requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getBulkListingRequests(@Query('status') status?: string) {
    return this.listingsService.getBulkListingRequests(status);
  }

  // ADMIN: Get bulk listing request details
  @Get('bulk/requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getBulkListingRequest(@Param('id') id: string) {
    return this.listingsService.getBulkListingRequestById(id);
  }

  // ADMIN: Approve bulk listing items
  @Post('bulk/requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveBulkListing(
    @Param('id') id: string,
    @Body() dto: ApproveBulkListingDto,
  ) {
    return this.listingsService.approveBulkListingItems(id, dto.selectedIndices, dto.markupType, dto.markupValue);
  }

  // ADMIN: Delete bulk listing request
  @Delete('bulk/requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteBulkListingRequest(@Param('id') id: string) {
    return this.listingsService.deleteBulkListingRequest(id);
  }

  // ADMIN: Get similar medicines for a bulk item
  @Get('bulk/requests/:id/similar/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getSimilarMedicines(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.listingsService.getSimilarMedicinesForItem(id, parseInt(index, 10));
  }

  // ADMIN: Manually map a bulk item to a medicine
  @Post('bulk/requests/:id/map-item')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async mapBulkItem(
    @Param('id') id: string,
    @Body() dto: { index: number; medicineId: string; matchType: 'ACTIVE' | 'REFERENCE' },
  ) {
    return this.listingsService.mapBulkItemToMedicine(id, dto.index, dto.medicineId, dto.matchType);
  }

  // ADMIN: Get pending medicine proposals (MUST be before :id routes)
  @Get('proposals/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingProposals() {
    return this.listingsService.getPendingProposals();
  }

  // ADMIN: Approve medicine proposal (MUST be before :id routes)
  @Patch('proposals/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveMedicineProposal(
    @Param('id') id: string,
    @Body() dto: ApproveListingDto,
  ) {
    return this.listingsService.approveMedicineProposal(id, dto.adminMarkupPct);
  }

  // ADMIN: Reject medicine proposal (MUST be before :id routes)
  @Patch('proposals/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectMedicineProposal(
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.listingsService.rejectMedicineProposal(id, dto.reviewerNote);
  }

  // ADMIN: Get pending listings
  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingListings() {
    return this.listingsService.getPendingListings();
  }

  // ADMIN: Approve listing
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveListing(@Param('id') id: string, @Body() dto: ApproveListingDto) {
    return this.listingsService.approveListing(
      id,
      dto.markupType || 'PERCENTAGE',
      dto.adminMarkupPct,
      dto.reviewerNote,
    );
  }

  // ADMIN: Reject listing
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectListing(@Param('id') id: string, @Body() dto: RejectListingDto) {
    return this.listingsService.rejectListing(id, dto.reviewerNote);
  }

  // ADMIN: Upload medicine image for listing
  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image'))
  async uploadMedicineImage(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }
    return this.listingsService.uploadMedicineImage(id, image);
  }

  // SELLER/TRADER: Update own listing
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileInterceptor('productImage'))
  async updateListing(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateListingDto,
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    return this.listingsService.updateListing(id, user.sub, dto, productImage);
  }

  // ADMIN: Update markup for a listing
  @Patch(':id/markup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateListingMarkup(
    @Param('id') id: string,
    @Body() dto: UpdateMarkupDto,
  ) {
    return this.listingsService.updateListingMarkup(id, dto.adminMarkupPct, dto.markupType || 'PERCENTAGE');
  }

  // SELLER/TRADER: Delete own listing
  @Patch(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  async deleteListing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.listingsService.deleteListing(id, user.sub);
  }

  // PUBLIC: Get active listings (for buyers/traders)
  @Get()
  @Public()
  async getActiveListings(
    @Query('medicineId') medicineId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.listingsService.getActiveListings(medicineId, search, pageNum, limitNum);
  }

  // PUBLIC: Get listing by ID
  @Get(':id')
  @Public()
  async getListing(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }
}
