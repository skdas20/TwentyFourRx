import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }
}
