import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  constructor(private prisma: PrismaService) {}

  async getPriceHistoryByMedicine(medicineId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.prisma.priceHistory.findMany({
      where: {
        medicineId,
        day: { gte: startDate },
      },
      orderBy: { day: 'asc' },
    });

    // Get current listings for this medicine
    const currentListings = await this.prisma.listing.findMany({
      where: {
        medicineId,
        status: 'ACTIVE',
        stock: { gt: 0 },
      },
      select: {
        listPrice: true,
        basePrice: true,
      },
    });

    let currentPrice: { min: number; max: number; avg: number } | null = null;
    if (currentListings.length > 0) {
      const prices = currentListings.map((l) => l.listPrice?.toNumber() || l.basePrice.toNumber());
      currentPrice = {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      };
    }

    return {
      medicineId,
      history: history.map((h) => ({
        date: h.day,
        minPrice: h.minPrice.toNumber(),
        maxPrice: h.maxPrice.toNumber(),
        avgPrice: h.avgPrice.toNumber(),
      })),
      currentPrice,
      days,
    };
  }

  async getPriceHistoryByComposition(composition: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find all medicine references with this composition
    const medicineRefs = await this.prisma.medicineReference.findMany({
      where: {
        composition: {
          contains: composition,
          mode: 'insensitive' as Prisma.QueryMode,
        },
        isActive: true,
      },
      select: {
        name: true,
        manufacturer: true,
      },
      take: 50,
    });

    // Get medicines from medicines table matching these references
    const medicines = await this.prisma.medicine.findMany({
      where: {
        OR: medicineRefs.map((ref) => ({
          name: ref.name,
          manufacturer: {
            name: ref.manufacturer,
          },
        })),
      },
      include: {
        manufacturer: true,
        priceHistory: {
          where: { day: { gte: startDate } },
          orderBy: { day: 'asc' },
        },
      },
    });

    // Aggregate price history across all medicines with this composition
    const aggregatedHistory: Record<string, { min: number[]; max: number[]; avg: number[] }> = {};

    medicines.forEach((medicine) => {
      medicine.priceHistory.forEach((ph) => {
        const dateKey = ph.day.toISOString().split('T')[0];
        if (!aggregatedHistory[dateKey]) {
          aggregatedHistory[dateKey] = { min: [], max: [], avg: [] };
        }
        aggregatedHistory[dateKey].min.push(ph.minPrice.toNumber());
        aggregatedHistory[dateKey].max.push(ph.maxPrice.toNumber());
        aggregatedHistory[dateKey].avg.push(ph.avgPrice.toNumber());
      });
    });

    const history = Object.entries(aggregatedHistory)
      .map(([date, prices]) => ({
        date: new Date(date),
        minPrice: Math.min(...prices.min),
        maxPrice: Math.max(...prices.max),
        avgPrice: prices.avg.reduce((a, b) => a + b, 0) / prices.avg.length,
        medicineCount: medicines.length,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      composition,
      medicineCount: medicines.length,
      history,
      days,
    };
  }

  async getTrendingMedicines(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get recent price history
    const recentHistory = await this.prisma.priceHistory.findMany({
      where: {
        day: { gte: startDate },
      },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
      orderBy: { day: 'desc' },
    });

    // Get unique medicine IDs
    const medicineIds = [...new Set(recentHistory.map(ph => ph.medicineId))];

    // Get current lowest prices from active listings (same as dashboard.service.ts)
    const currentListings = await this.prisma.listing.findMany({
      where: {
        medicineId: { in: medicineIds },
        status: 'ACTIVE',
        stock: { gt: 0 },
      },
      orderBy: { listPrice: 'asc' },
    });

    // Build map of medicine ID to lowest current price
    const currentPriceMap = new Map<string, number>();
    for (const listing of currentListings) {
      if (!currentPriceMap.has(listing.medicineId)) {
        const price = Number(listing.listPrice || listing.basePrice || 0);
        if (price > 0) {
          currentPriceMap.set(listing.medicineId, price);
        }
      }
    }

    // Calculate price changes using actual listing prices
    const priceChanges: Record<string, {
      medicine: any;
      oldPrice: number;
      newPrice: number;
      latestDay: number;
      earliestDay: number;
      change: number;
      changePercent: number;
    }> = {};

    recentHistory.forEach((ph) => {
      const medicineId = ph.medicineId;
      const currentDate = ph.day.getTime();
      const historyPrice = ph.avgPrice.toNumber();

      if (!priceChanges[medicineId]) {
        priceChanges[medicineId] = {
          medicine: ph.medicine,
          oldPrice: historyPrice,
          newPrice: currentPriceMap.get(medicineId) || historyPrice, // Use actual listing price
          latestDay: currentDate,
          earliestDay: currentDate,
          change: 0,
          changePercent: 0,
        };
      } else {
        const record = priceChanges[medicineId];

        // Update newPrice with actual listing price (not history avg)
        if (currentPriceMap.has(medicineId)) {
          record.newPrice = currentPriceMap.get(medicineId)!;
        }

        if (currentDate < record.earliestDay) {
          record.earliestDay = currentDate;
          record.oldPrice = historyPrice;
        }
      }
    });

    // Calculate changes
    const trending = Object.values(priceChanges)
      .filter((pc) => currentPriceMap.has(pc.medicine.id)) // Only include medicines with active listings
      .map((pc) => {
        pc.change = pc.newPrice - pc.oldPrice;
        pc.changePercent = pc.oldPrice > 0 ? (pc.change / pc.oldPrice) * 100 : 0;
        return pc;
      })
      .filter((pc) => Math.abs(pc.changePercent) >= 0.5) // Show moves >= 0.5%
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 20);

    return {
      trending,
      days,
    };
  }

  async compareCompositionPrices(composition: string) {
    // Find all medicine references with this composition
    const medicineRefs = await this.prisma.medicineReference.findMany({
      where: {
        composition: {
          contains: composition,
          mode: 'insensitive' as Prisma.QueryMode,
        },
        isActive: true,
      },
      select: {
        name: true,
        manufacturer: true,
        form: true,
        strength: true,
      },
      take: 50,
    });

    // Get medicines with active listings
    const medicines = await this.prisma.medicine.findMany({
      where: {
        OR: medicineRefs.map((ref) => ({
          name: ref.name,
          manufacturer: {
            name: ref.manufacturer,
          },
        })),
      },
      include: {
        manufacturer: true,
        listings: {
          where: {
            status: 'ACTIVE',
            stock: { gt: 0 },
          },
          select: {
            listPrice: true,
            basePrice: true,
            stock: true,
          },
        },
      },
    });

    const comparison = medicines
      .filter((m) => m.listings.length > 0)
      .map((medicine) => {
        const prices = medicine.listings.map((l) => 
          l.listPrice?.toNumber() || l.basePrice.toNumber()
        );
        const totalStock = medicine.listings.reduce((sum, l) => sum + l.stock, 0);

        return {
          id: medicine.id,
          name: medicine.name,
          form: medicine.form,
          strength: medicine.strength,
          manufacturer: medicine.manufacturer.name,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
          listingCount: medicine.listings.length,
          totalStock,
        };
      })
      .sort((a, b) => a.avgPrice - b.avgPrice);

    return {
      composition,
      medicineCount: comparison.length,
      comparison,
    };
  }

  /**
   * Record daily price snapshot for all medicines with active listings.
   * This creates/updates price_history records based on real listing data.
   * Called automatically every day at midnight, or manually via API.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recordDailyPriceSnapshot() {
    this.logger.log('📊 Starting daily price snapshot recording...');

    try {
      // Get today's date (normalized to start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all medicines with active listings
      const medicinesWithListings = await this.prisma.medicine.findMany({
        where: {
          listings: {
            some: {
              status: 'ACTIVE',
              stock: { gt: 0 },
            },
          },
        },
        include: {
          listings: {
            where: {
              status: 'ACTIVE',
              stock: { gt: 0 },
            },
            select: {
              listPrice: true,
              basePrice: true,
            },
          },
        },
      });

      this.logger.log(`Found ${medicinesWithListings.length} medicines with active listings`);

      let recorded = 0;
      let updated = 0;

      for (const medicine of medicinesWithListings) {
        const prices = medicine.listings.map(
          (l) => l.listPrice?.toNumber() || l.basePrice.toNumber()
        );

        if (prices.length === 0) continue;

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // Upsert price history record for today
        const existing = await this.prisma.priceHistory.findUnique({
          where: {
            medicineId_day: {
              medicineId: medicine.id,
              day: today,
            },
          },
        });

        if (existing) {
          // Update existing record (prices may have changed during the day)
          await this.prisma.priceHistory.update({
            where: {
              medicineId_day: {
                medicineId: medicine.id,
                day: today,
              },
            },
            data: {
              minPrice,
              maxPrice,
              avgPrice,
            },
          });
          updated++;
        } else {
          // Create new record
          await this.prisma.priceHistory.create({
            data: {
              medicineId: medicine.id,
              day: today,
              minPrice,
              maxPrice,
              avgPrice,
            },
          });
          recorded++;
        }
      }

      this.logger.log(`✅ Price snapshot complete: ${recorded} new records, ${updated} updated`);

      return {
        success: true,
        date: today,
        medicinesProcessed: medicinesWithListings.length,
        newRecords: recorded,
        updatedRecords: updated,
      };
    } catch (error) {
      this.logger.error('❌ Failed to record price snapshot:', error);
      throw error;
    }
  }

  /**
   * Manually trigger price snapshot recording (for testing or catch-up)
   */
  async manualPriceSnapshot() {
    return this.recordDailyPriceSnapshot();
  }

  /**
   * Record price history when a listing is activated/approved.
   * This ensures we capture price data immediately, not just at midnight.
   */
  async recordPriceOnListingActivation(medicineId: string, listPrice: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get all active listings for this medicine to calculate accurate stats
      const activeListings = await this.prisma.listing.findMany({
        where: {
          medicineId,
          status: 'ACTIVE',
          stock: { gt: 0 },
        },
        select: {
          listPrice: true,
          basePrice: true,
        },
      });

      const prices = activeListings.map(
        (l) => l.listPrice?.toNumber() || l.basePrice.toNumber()
      );

      if (prices.length === 0) {
        prices.push(listPrice); // Use the new listing price if no others exist
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      // Upsert today's price history
      await this.prisma.priceHistory.upsert({
        where: {
          medicineId_day: {
            medicineId,
            day: today,
          },
        },
        update: {
          minPrice,
          maxPrice,
          avgPrice,
        },
        create: {
          medicineId,
          day: today,
          minPrice,
          maxPrice,
          avgPrice,
        },
      });

      this.logger.log(`📈 Price history updated for medicine ${medicineId}: min=${minPrice}, max=${maxPrice}, avg=${avgPrice}`);
    } catch (error) {
      this.logger.error(`Failed to record price for medicine ${medicineId}:`, error);
      // Don't throw - this is a non-critical operation
    }
  }
}
