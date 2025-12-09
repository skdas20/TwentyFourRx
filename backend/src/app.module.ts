import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

import { PrismaService } from './config/prisma.service';
import { RedisService } from './config/redis.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { KycModule } from './kyc/kyc.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { MarketersModule } from './marketers/marketers.module';
import { MedicinesModule } from './medicines/medicines.module';
import { ListingsModule } from './listings/listings.module';
import { OrdersModule } from './orders/orders.module';
import { HoldsModule } from './holds/holds.module';
import { InventoryModule } from './inventory/inventory.module';
import { PricesModule } from './prices/prices.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ScrapingModule } from './scraping/scraping.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PriceAlertsModule } from './price-alerts/price-alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BuyProposalsModule } from './buy-proposals/buy-proposals.module';
import { DeliveryRequestsModule } from './delivery-requests/delivery-requests.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),
    AuthModule,
    UsersModule,
    KycModule,
    ManufacturersModule,
    MarketersModule,
    MedicinesModule,
    ListingsModule,
    OrdersModule,
    HoldsModule,
    InventoryModule,
    PricesModule,
    NewsModule,
    NotificationsModule,
    AnalyticsModule,
    ScrapingModule,
    WatchlistModule,
    PriceAlertsModule,
    DashboardModule,
    BuyProposalsModule,
    DeliveryRequestsModule,
  ],
  providers: [
    PrismaService,
    RedisService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule { }
