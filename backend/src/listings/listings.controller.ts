import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { IsString, IsNumber, IsPositive, IsInt } from 'class-validator';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

export class CreateListingDto {
  @IsString()
  medicineReferenceId: string;

  @IsNumber()
  @IsPositive()
  basePrice: number;

  @IsInt()
  @IsPositive()
  stock: number;
}

export class ApproveListingDto {
  @IsNumber()
  @IsPositive()
  adminMarkupPct?: number;

  @IsString()
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
  async createListing(
    @CurrentUser() user: any,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.createListing(
      user.sub,
      dto.medicineReferenceId,
      dto.basePrice,
      dto.stock,
    );
  }

  // SELLER/TRADER: Get my listings
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  async getMyListings(@CurrentUser() user: any) {
    return this.listingsService.getListingsBySeller(user.sub);
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
  async getActiveListings(@Query('medicineId') medicineId?: string) {
    return this.listingsService.getActiveListings(medicineId);
  }

  // PUBLIC: Get listing by ID
  @Get(':id')
  @Public()
  async getListing(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }
}
