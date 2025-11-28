import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsNumber, IsPositive, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

export class CreateListingDto {
  @IsString()
  medicineReferenceId: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  basePrice: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  stock: number;
}

export class ApproveListingDto {
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  adminMarkupPct?: number;

  @IsString()
  @IsOptional()
  reviewerNote?: string;
}

export class RejectListingDto {
  @IsString()
  reviewerNote: string;
}

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  // SELLER/TRADER: Create new listing (from medicine_references)
  // Both can create listings - same permissions
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileInterceptor('document'))
  async createListing(
    @CurrentUser() user: any,
    @Body() dto: CreateListingDto,
    @UploadedFile() document?: Express.Multer.File,
  ) {
    console.log('📥 Received listing creation request:', {
      userId: user.sub,
      medicineReferenceId: dto.medicineReferenceId,
      basePrice: dto.basePrice,
      stock: dto.stock,
      hasDocument: !!document,
      documentName: document?.originalname,
      documentSize: document?.size,
    });
    
    return this.listingsService.createListing(
      user.sub,
      dto.medicineReferenceId,
      dto.basePrice,
      dto.stock,
      document,
    );
  }

  // SELLER/TRADER: Get my listings
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  async getMyListings(@CurrentUser() user: any) {
    return this.listingsService.getListingsBySeller(user.sub);
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

  // PUBLIC: Get active listings (for buyers/traders)
  @Get()
  @Public()
  async getActiveListings(
    @Query('medicineId') medicineId?: string,
    @Query('search') search?: string,
  ) {
    return this.listingsService.getActiveListings(medicineId, search);
  }

  // PUBLIC: Get listing by ID
  @Get(':id')
  @Public()
  async getListing(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }
}
