import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PriceAlertsService } from './price-alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertsController {
  constructor(private readonly priceAlertsService: PriceAlertsService) {}

  @Get()
  async getUserPriceAlerts(@Request() req) {
    return this.priceAlertsService.getUserPriceAlerts(req.user.sub);
  }

  @Post()
  async createPriceAlert(
    @Request() req,
    @Body()
    body: {
      medicineId: string;
      targetPrice: number;
      condition: 'BELOW' | 'ABOVE' | 'EQUALS';
    },
  ) {
    return this.priceAlertsService.createPriceAlert(
      req.user.sub,
      body.medicineId,
      body.targetPrice,
      body.condition,
    );
  }

  @Delete(':id')
  async deletePriceAlert(@Request() req, @Param('id') id: string) {
    return this.priceAlertsService.deletePriceAlert(req.user.sub, id);
  }

  @Patch(':id/toggle')
  async togglePriceAlert(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.priceAlertsService.togglePriceAlert(
      req.user.sub,
      id,
      body.isActive,
    );
  }

  @Post('check-all')
  async checkAllAlerts() {
    // This endpoint could be called by a cron job
    return this.priceAlertsService.checkAndTriggerAlerts();
  }
}
