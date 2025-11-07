import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('scraping')
@UseGuards(JwtAuthGuard)
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  // Admin only - manual trigger
  @Post('sync')
  @Roles('ADMIN')
  async manualSync() {
    const count = await this.scrapingService.manualSync();
    return {
      success: true,
      message: `Scraped ${count} medicines successfully`,
      count,
    };
  }

  // Admin only - get stats
  @Get('stats')
  @Roles('ADMIN')
  async getStats() {
    return this.scrapingService.getStats();
  }
}
