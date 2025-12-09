import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';
import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
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

    // ADMIN/SELLER: Mark as dispatched
    @Post(':id/dispatch')
    @Roles('ADMIN', 'SELLER')
    async markDispatched(@Param('id') id: string) {
        return this.service.markDispatched(id);
    }
}
