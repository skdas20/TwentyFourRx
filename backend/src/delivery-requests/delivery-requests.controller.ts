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
    UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
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

class AssignCourierDto {
    @IsString()
    @IsNotEmpty()
    courierId: string;

    @IsString()
    @IsNotEmpty()
    destinationAddress: string;
}

class CourierAcceptDeliveryDto {
    @IsString()
    @IsNotEmpty()
    billAmount: string;

    @IsString()
    @IsOptional()
    trackingNumber?: string;

    @IsString()
    @IsOptional()
    deliveryPartner?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

class MarkPaymentReceivedDto {
    @IsString()
    @IsOptional()
    note?: string;
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

    // ADMIN/SELLER: Mark as dispatched with invoice and package image upload
    @Post(':id/dispatch')
    @Roles('SELLER', 'TRADER')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'invoice', maxCount: 1 },
        { name: 'packageImage', maxCount: 1 },
    ]))
    async markDispatched(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFiles() files: { invoice?: Express.Multer.File[], packageImage?: Express.Multer.File[] },
        @Body() dto: MarkDispatchedDto,
    ) {
        // Extract invoice and packageImage from the fields object
        const invoiceFile = files?.invoice?.[0];
        const packageImageFile = files?.packageImage?.[0];
        
        return this.service.markDispatched(id, user.sub, invoiceFile, packageImageFile, dto.trackingNumber, dto.deliveryPartner);
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

    // COURIER: Get my assigned deliveries
    @Get('courier/my')
    @Roles('COURIER')
    async getCourierDeliveries(@CurrentUser() user: any) {
        return this.service.getCourierDeliveries(user.sub);
    }

    // COURIER: Update delivery status
    @Post('courier/:id/status')
    @Roles('COURIER')
    async updateCourierStatus(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: { status: string; notes?: string },
    ) {
        return this.service.updateCourierStatus(id, user.sub, dto.status, dto.notes);
    }

    // COURIER: Accept assigned delivery and submit dispatch details
    @Post('courier/:id/accept')
    @Roles('COURIER')
    @UseInterceptors(FileInterceptor('invoice'))
    async courierAcceptDelivery(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() invoice: Express.Multer.File,
        @Body() dto: CourierAcceptDeliveryDto,
    ) {
        return this.service.courierAcceptDelivery(
            id,
            user.sub,
            Number(dto.billAmount),
            invoice,
            dto.trackingNumber,
            dto.deliveryPartner,
            dto.notes,
        );
    }

    // COURIER: Upload delivery proof
    @Post('courier/:id/proof')
    @Roles('COURIER')
    @UseInterceptors(FileInterceptor('proof'))
    async uploadDeliveryProof(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.service.uploadDeliveryProof(id, user.sub, file);
    }

    // ADMIN: Assign courier to delivery
    @Post(':id/assign-courier')
    @Roles('ADMIN')
    async assignCourier(
        @Param('id') id: string,
        @Body() dto: AssignCourierDto,
    ) {
        return this.service.assignCourier(id, dto.courierId, dto.destinationAddress);
    }

    // ADMIN: Confirm buyer payment for delivery charge
    @Post(':id/mark-payment-received')
    @Roles('ADMIN')
    async markPaymentReceived(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: MarkPaymentReceivedDto,
    ) {
        return this.service.markDeliveryChargePaid(id, user.sub, dto.note);
    }
}
