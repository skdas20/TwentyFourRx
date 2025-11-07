import { Controller, Get, Query } from '@nestjs/common';
import { PricesService } from './prices.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('prices')
export class PricesController {
  constructor(private pricesService: PricesService) {}

  // Get price history/trends for a medicine
  @Get('history')
  @Public()
  async getPriceHistory(
    @Query('medicineId') medicineId?: string,
    @Query('composition') composition?: string,
    @Query('days') days?: string,
  ) {
    const dayCount = days ? parseInt(days) : 30;
    
    if (medicineId) {
      return this.pricesService.getPriceHistoryByMedicine(medicineId, dayCount);
    }
    
    if (composition) {
      return this.pricesService.getPriceHistoryByComposition(composition, dayCount);
    }
    
    return { error: 'Please provide medicineId or composition' };
  }

  // Get trending medicines (highest price changes)
  @Get('trending')
  @Public()
  async getTrendingPrices(@Query('days') days?: string) {
    const dayCount = days ? parseInt(days) : 7;
    return this.pricesService.getTrendingMedicines(dayCount);
  }

  // Get average prices for same composition across different brands
  @Get('compare')
  @Public()
  async compareCompositionPrices(@Query('composition') composition: string) {
    if (!composition) {
      return { error: 'Composition is required' };
    }
    return this.pricesService.compareCompositionPrices(composition);
  }
}
