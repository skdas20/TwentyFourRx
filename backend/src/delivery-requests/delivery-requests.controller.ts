import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { IsString, IsNumber, IsNotEmpty, Min, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { DeliveryRequestsService } from './delivery-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// DTOs
class CreateDeliveryRequestDto {
    @IsString()
    @IsNotEmpty()
    inventoryLotId: string;

    @IsNumber()
    @Min(1)
    qty: number;
}

class SubmitShippingDetailsDto {
    @IsString()
    @IsNotEmpty()
    batchNumber: string;

    @IsString()
    @IsNotEmpty()
    expiryDate: string; // ISO date string

    @IsNumber()
    @Min(0.1)
    parcelWeightKg: number;

    @IsEnum(['ROAD', 'AIR'])
    @IsNotEmpty()
    transportMode: 'ROAD' | 'AIR';
}

class VerifyPaymentDto {
    @IsBoolean()
    @IsNotEmpty()
    approved: boolean;

    @IsString()
    @IsOptional()
    note?: string;
}

class InitiateDispatchDto {
    @IsString()
    @IsNotEmpty()
    sourceAddress: string;

    @IsString()
    @IsNotEmpty()
    destinationAddress: string;

    @IsString()
    @IsNotEmpty()
    assignedCourierId: string;
}

class UpdateCourierStatusDto {
    @IsEnum(['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'])
    @IsNotEmpty()
    status: 'DISPATCHED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY';

    @IsString()
    @IsOptional()
    notes?: string;
}

class ConfirmDeliveryDto {
    @IsString()
    @IsNotEmpty()
    otp: string;
}

@Controller('delivery-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryRequestsController {
    constructor(private service: DeliveryRequestsService) { }

    // ==================== STEP 1: BUYER CREATES REQUEST ====================
    @Post()
    @Roles('SELLER', 'TRADER')
    async createRequest(
        @CurrentUser() user: any,
        @Body() dto: CreateDeliveryRequestDto,
    ) {
        return this.service.createRequest(user.sub, dto.inventoryLotId, dto.qty);
    }

    // ==================== STEP 2: SELLER PROVIDES SHIPPING DETAILS ====================
    @Post(':id/shipping-details')
    @Roles('SELLER', 'TRADER')
    async submitShippingDetails(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: SubmitShippingDetailsDto,
    ) {
        return this.service.submitShippingDetails(id, user.sub, dto);
    }

    // ==================== STEP 3: BUYER UPLOADS PAYMENT RECEIPT ====================
    @Post(':id/payment-receipt')
    @Roles('SELLER', 'TRADER')
    @UseInterceptors(FileInterceptor('paymentReceipt'))
    async uploadPaymentReceipt(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Payment receipt file is required');
        }
        return this.service.uploadPaymentReceipt(id, user.sub, file);
    }

    // ==================== STEP 4: ADMIN VERIFIES PAYMENT ====================
    @Post(':id/verify-payment')
    @Roles('ADMIN')
    async verifyPayment(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: VerifyPaymentDto,
    ) {
        return this.service.verifyPayment(id, user.sub, dto.approved, dto.note);
    }

    // ==================== STEP 5: SELLER UPLOADS INVOICE ====================
    @Post(':id/seller-invoice')
    @Roles('SELLER', 'TRADER')
    @UseInterceptors(FileInterceptor('invoice'))
    async uploadSellerInvoice(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Invoice file is required');
        }
        return this.service.uploadSellerInvoice(id, user.sub, file);
    }

    // ==================== STEP 6: ADMIN INITIATES DISPATCH ====================
    @Post(':id/initiate-dispatch')
    @Roles('ADMIN')
    @UseInterceptors(FileInterceptor('adminInvoice'))
    async initiateDispatch(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: InitiateDispatchDto,
    ) {
        if (!file) {
            throw new BadRequestException('Admin invoice file is required');
        }
        return this.service.initiateDispatch(id, user.sub, {
            adminInvoiceFile: file,
            sourceAddress: dto.sourceAddress,
            destinationAddress: dto.destinationAddress,
            assignedCourierId: dto.assignedCourierId,
        });
    }

    // ==================== STEP 7: COURIER UPDATES STATUS ====================
    @Patch('courier/:id/status')
    @Roles('COURIER')
    async updateCourierStatus(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateCourierStatusDto,
    ) {
        return this.service.updateCourierStatus(id, user.sub, dto.status, dto.notes);
    }

    // ==================== STEP 8: BUYER CONFIRMS DELIVERY WITH OTP ====================
    @Post(':id/confirm-delivery')
    @Roles('SELLER', 'TRADER')
    async confirmDelivery(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: ConfirmDeliveryDto,
    ) {
        return this.service.confirmDeliveryWithOtp(id, user.sub, dto.otp);
    }

    // ==================== HELPER ENDPOINTS ====================

    // Get my requests (buyer)
    @Get('my')
    @Roles('SELLER', 'TRADER')
    async getMyRequests(@CurrentUser() user: any) {
        return this.service.getMyRequests(user.sub);
    }

    // Get seller requests
    @Get('seller/my')
    @Roles('SELLER', 'TRADER')
    async getSellerRequests(@CurrentUser() user: any) {
        return this.service.getSellerRequests(user.sub);
    }

    // Get courier requests
    @Get('courier/my')
    @Roles('COURIER')
    async getCourierRequests(@CurrentUser() user: any) {
        return this.service.getCourierRequests(user.sub);
    }

    // Get all requests (admin)
    @Get()
    @Roles('ADMIN')
    async getAllRequests(@Query('status') status?: string) {
        return this.service.getAllRequests(status);
    }

    // Get single request details
    @Get(':id')
    async getRequestDetails(@Param('id') id: string, @CurrentUser() user: any) {
        // This will be implemented in service to check permissions
        const requests = await this.service.getAllRequests();
        const request = requests.find(r => r.id === id);
        
        if (!request) {
            throw new BadRequestException('Request not found');
        }

        // Check if user has access to this request
        const hasAccess = 
            request.requesterId === user.sub || // Buyer
            request.inventoryLot?.sourceOrder?.listing?.sellerId === user.sub || // Seller
            request.assignedCourierId === user.sub || // Courier
            user.roleCode === 'ADMIN'; // Admin

        if (!hasAccess) {
            throw new BadRequestException('Access denied');
        }

        return request;
    }
}
