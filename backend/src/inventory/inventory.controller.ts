import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getUserInventory(@Request() req) {
    return this.inventoryService.getUserInventory(req.user.sub);
  }

  @Get('history')
  async getInventoryHistory(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.inventoryService.getInventoryHistory(req.user.sub, daysNum);
  }

  @Get('low-stock')
  async getLowStockInventory(
    @Request() req,
    @Query('threshold') threshold?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold, 10) : 100;
    return this.inventoryService.getLowStockInventory(req.user.sub, thresholdNum);
  }

  @Get('expiring')
  async getExpiringInventory(
    @Request() req,
    @Query('withinDays') withinDays?: string,
  ) {
    const daysNum = withinDays ? parseInt(withinDays, 10) : 90;
    return this.inventoryService.getExpiringInventory(req.user.sub, daysNum);
  }
}
