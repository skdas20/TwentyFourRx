import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
} from '@nestjs/common';
import { HoldsService } from './holds.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class CreateHoldDto {
  listingId: string;
  qty: number;
}

@Controller('holds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HoldsController {
  constructor(private holdsService: HoldsService) {}

  // TRADER/SELLER: Create a new hold (10-day reservation)
  @Post()
  @Roles('TRADER', 'SELLER')
  async createHold(@CurrentUser() user: any, @Body() dto: CreateHoldDto) {
    return this.holdsService.createHold(user.sub, dto.listingId, dto.qty);
  }

  // TRADER/SELLER: Get my holds
  @Get('my')
  @Roles('TRADER', 'SELLER')
  async getMyHolds(@CurrentUser() user: any) {
    return this.holdsService.getHoldsByTrader(user.sub);
  }

  // TRADER/SELLER: Cancel a hold manually
  @Post(':id/cancel')
  @Roles('TRADER', 'SELLER')
  async cancelHold(@CurrentUser() user: any, @Param('id') holdId: string) {
    return this.holdsService.cancelHold(holdId, user.sub);
  }

  // ADMIN: Get all holds
  @Get()
  @Roles('ADMIN')
  async getAllHolds() {
    return this.holdsService.getAllHolds();
  }
}
