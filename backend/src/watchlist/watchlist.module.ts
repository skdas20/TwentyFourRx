import { Module } from '@nestjs/common';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { PrismaService } from '../config/prisma.service';

@Module({
  controllers: [WatchlistController],
  providers: [WatchlistService, PrismaService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
