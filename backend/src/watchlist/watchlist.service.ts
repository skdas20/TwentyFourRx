import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add a medicine to user's watchlist
   */
  async addToWatchlist(userId: string, medicineId: string, name?: string, color?: string) {
    // Check if medicine exists
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    // Check if already in watchlist
    const existing = await this.prisma.watchlist.findUnique({
      where: {
        uq_watchlist_user_medicine: {
          userId,
          medicineId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Medicine already in watchlist');
    }

    // Get current max sort order
    const maxOrder = await this.prisma.watchlist.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

    return this.prisma.watchlist.create({
      data: {
        userId,
        medicineId,
        name,
        color,
        sortOrder,
      },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
      },
    });
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string) {
    const watchlistItems = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
            listings: {
              where: { status: 'ACTIVE' },
              orderBy: { listPrice: 'asc' },
              take: 1, // Get cheapest active listing
              select: {
                id: true,
                listPrice: true,
                stock: true,
              },
            },
            priceHistory: {
              orderBy: { day: 'desc' },
              take: 30, // Last 30 days
            },
          },
        },
      },
    });

    // Format response with current price and price change
    return watchlistItems.map((item) => {
      const currentPrice = item.medicine.listings[0]?.listPrice || null;
      const priceHistory = item.medicine.priceHistory;

      let priceChange: number | null = null;
      let priceChangePercent: string | null = null;

      if (priceHistory.length > 0 && currentPrice) {
        // Compare current price vs oldest price in history (same as listings)
        const oldestAvg = Number(priceHistory[priceHistory.length - 1].avgPrice);
        const current = Number(currentPrice);

        if (oldestAvg > 0) {
          priceChange = current - oldestAvg;
          priceChangePercent = ((priceChange / oldestAvg) * 100).toFixed(2);
        }
      }

      return {
        id: item.id,
        medicineId: item.medicineId,
        name: item.name,
        color: item.color,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        medicine: {
          id: item.medicine.id,
          name: item.medicine.name,
          form: item.medicine.form,
          strength: item.medicine.strength,
          manufacturer: item.medicine.manufacturer.name,
          marketer: item.medicine.marketer?.name,
          currentPrice: currentPrice ? Number(currentPrice) : null,
          stock: item.medicine.listings[0]?.stock || 0,
          priceChange,
          priceChangePercent,
        },
      };
    });
  }

  /**
   * Remove medicine from watchlist
   */
  async removeFromWatchlist(userId: string, watchlistId: string) {
    const item = await this.prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!item) {
      throw new NotFoundException('Watchlist item not found');
    }

    if (item.userId !== userId) {
      throw new BadRequestException('Not authorized to remove this item');
    }

    await this.prisma.watchlist.delete({
      where: { id: watchlistId },
    });

    return { message: 'Removed from watchlist' };
  }

  /**
   * Update watchlist item (rename, recolor, reorder)
   */
  async updateWatchlistItem(
    userId: string,
    watchlistId: string,
    data: { name?: string; color?: string; sortOrder?: number },
  ) {
    const item = await this.prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!item) {
      throw new NotFoundException('Watchlist item not found');
    }

    if (item.userId !== userId) {
      throw new BadRequestException('Not authorized to update this item');
    }

    return this.prisma.watchlist.update({
      where: { id: watchlistId },
      data,
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });
  }

  /**
   * Reorder watchlist items (for drag-and-drop)
   */
  async reorderWatchlist(userId: string, itemIds: string[]) {
    // Update each item with new sort order
    const updates = itemIds.map((id, index) =>
      this.prisma.watchlist.updateMany({
        where: { id, userId }, // Ensure user owns the item
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Watchlist reordered successfully' };
  }

  /**
   * Check if medicine is in watchlist
   */
  async isInWatchlist(userId: string, medicineId: string): Promise<boolean> {
    const item = await this.prisma.watchlist.findUnique({
      where: {
        uq_watchlist_user_medicine: {
          userId,
          medicineId,
        },
      },
    });

    return !!item;
  }
}
