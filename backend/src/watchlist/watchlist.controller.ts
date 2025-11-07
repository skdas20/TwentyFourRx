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
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getWatchlist(@Request() req) {
    return this.watchlistService.getWatchlist(req.user.sub);
  }

  @Post()
  async addToWatchlist(
    @Request() req,
    @Body() body: { medicineId: string; name?: string; color?: string },
  ) {
    return this.watchlistService.addToWatchlist(
      req.user.sub,
      body.medicineId,
      body.name,
      body.color,
    );
  }

  @Delete(':id')
  async removeFromWatchlist(@Request() req, @Param('id') id: string) {
    return this.watchlistService.removeFromWatchlist(req.user.sub, id);
  }

  @Patch(':id')
  async updateWatchlistItem(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string; sortOrder?: number },
  ) {
    return this.watchlistService.updateWatchlistItem(req.user.sub, id, body);
  }

  @Post('reorder')
  async reorderWatchlist(@Request() req, @Body() body: { itemIds: string[] }) {
    return this.watchlistService.reorderWatchlist(req.user.sub, body.itemIds);
  }

  @Get('check/:medicineId')
  async isInWatchlist(@Request() req, @Param('medicineId') medicineId: string) {
    const isInWatchlist = await this.watchlistService.isInWatchlist(
      req.user.sub,
      medicineId,
    );
    return { isInWatchlist };
  }
}
