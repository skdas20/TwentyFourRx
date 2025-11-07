import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('trader')
  async getTraderDashboard(@Request() req) {
    return this.dashboardService.getTraderDashboard(req.user.sub);
  }

  @Get('seller')
  async getSellerDashboard(@Request() req) {
    return this.dashboardService.getSellerDashboard(req.user.sub);
  }

  @Get('recent-listings')
  async getRecentListings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentListings(limitNum);
  }

  @Get('trending')
  async getTrendingMedicines(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getTrendingMedicines(limitNum);
  }

  @Get('portfolio-value')
  async getPortfolioValue(@Request() req) {
    return this.dashboardService.getPortfolioValue(req.user.sub);
  }

  @Get('statistics')
  async getUserStatistics(@Request() req) {
    return this.dashboardService.getUserStatistics(req.user.sub);
  }
}
