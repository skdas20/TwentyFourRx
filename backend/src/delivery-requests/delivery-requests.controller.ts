import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsNumber, IsNotEmpty, Min, IsBoolean, IsOptional } from 'class-validator';
import { DeliveryRequestsService } from './delivery-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class CreateDeliveryRequestDto {
    @IsString()
    @IsNotEmpty()
    inventoryLotId: string;

    @IsNumber()
    @Min(1)
    qty: number;
}

class ReviewRequestDto {
    reviewerNote?: string;
}

class ConfirmDeliveryDto {
    @IsString()
    @IsNotEmpty()
    otp: string;
}

class VerifyInvoiceDto {
    @IsBoolean()
    @IsNotEmpty()
    approved: boolean;

    @IsString()
    @IsOptional()
    note?: string;
}

class MarkDispatchedDto {
    @IsString()
    @IsNotEmpty()
    trackingNumber: string;

    @IsString()
    @IsNotEmpty()
    deliveryPartner: string;
}

@Controller('delivery-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryRequestsController {
    constructor(private service: DeliveryRequestsService) { }

    // SELLER/TRADER: Create a delivery request
    @Post()
    @Roles('SELLER', 'TRADER')
    async createRequest(
        @CurrentUser() user: any,
        @Body() dto: CreateDeliveryRequestDto,
    ) {
        console.log('Delivery request received:', { userId: user.sub, dto });
        return this.service.createRequest(user.sub, dto.inventoryLotId, dto.qty);
    }

    // SELLER/TRADER: Get my delivery requests
    @Get('my')
    @Roles('SELLER', 'TRADER')
    async getMyRequests(@CurrentUser() user: any) {
        return this.service.getMyRequests(user.sub);
    }

    // ADMIN: Get all delivery requests
    @Get()
    @Roles('ADMIN')
    async getAllRequests(@Query('status') status?: string) {
        return this.service.getAllRequests(status);
    }

    // ADMIN: Approve a delivery request
    @Post(':id/approve')
    @Roles('ADMIN')
    async approveRequest(
        @Param('id') id: string,
        @Body() dto: ReviewRequestDto,
    ) {
        return this.service.approveRequest(id, dto.reviewerNote);
    }

    // ADMIN: Reject a delivery request
    @Post(':id/reject')
    @Roles('ADMIN')
    async rejectRequest(
        @Param('id') id: string,
        @Body() dto: ReviewRequestDto,
    ) {
        if (!dto.reviewerNote) {
            throw new Error('Rejection reason is required');
        }
        return this.service.rejectRequest(id, dto.reviewerNote);
    }

    // ADMIN/SELLER: Mark as dispatched with invoice upload
    @Post(':id/dispatch')
    @Roles('SELLER', 'TRADER')
    @UseInterceptors(FileInterceptor('invoice'))
    async markDispatched(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: MarkDispatchedDto,
    ) {
        return this.service.markDispatched(id, user.sub, file, dto.trackingNumber, dto.deliveryPartner);
    }

    // ADMIN: Get pending invoice verifications
    @Get('pending-verification')
    @Roles('ADMIN')
    async getPendingVerification() {
        return this.service.getPendingVerification();
    }

    // ADMIN: Verify invoice and dispatch
    @Post(':id/verify')
    @Roles('ADMIN')
    async verifyAndDispatch(
        @Param('id') id: string,
        @Body() dto: VerifyInvoiceDto,
    ) {
        return this.service.verifyAndDispatch(id, dto.approved, dto.note);
    }

    // BUYER: Confirm delivery with OTP
    @Post(':id/confirm')
    @Roles('SELLER', 'TRADER')
    async confirmDelivery(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: ConfirmDeliveryDto,
    ) {
        return this.service.confirmDelivery(id, user.sub, dto.otp);
    }
}
