import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PricesService {
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

    // Calculate price changes
    const priceChanges: Record<string, { 
      medicine: any; 
      oldPrice: number; 
      newPrice: number; 
      change: number;
      changePercent: number;
    }> = {};

    recentHistory.forEach((ph) => {
      const medicineId = ph.medicineId;
      if (!priceChanges[medicineId]) {
        priceChanges[medicineId] = {
          medicine: ph.medicine,
          oldPrice: ph.avgPrice.toNumber(),
          newPrice: ph.avgPrice.toNumber(),
          change: 0,
          changePercent: 0,
        };
      } else {
        // Update if this is a more recent price
        const currentDate = ph.day.getTime();
        const existingDate = new Date(priceChanges[medicineId].newPrice).getTime();
        
        if (currentDate > existingDate) {
          priceChanges[medicineId].newPrice = ph.avgPrice.toNumber();
        } else {
          priceChanges[medicineId].oldPrice = ph.avgPrice.toNumber();
        }
      }
    });

    // Calculate changes
    const trending = Object.values(priceChanges)
      .map((pc) => {
        pc.change = pc.newPrice - pc.oldPrice;
        pc.changePercent = pc.oldPrice > 0 ? (pc.change / pc.oldPrice) * 100 : 0;
        return pc;
      })
      .filter((pc) => Math.abs(pc.changePercent) > 1) // Only show changes > 1%
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
}
