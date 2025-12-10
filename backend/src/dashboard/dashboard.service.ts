import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard data for traders
   */
  async getTraderDashboard(userId: string) {
    const [
      topHeld,
      topBought,
      recentHolds,
      recentOrders,
      portfolioValue,
      statistics,
    ] = await Promise.all([
      this.getTopHeld(userId, 4),
      this.getTopBought(userId, 4),
      this.getRecentHolds(userId, 4),
      this.getRecentOrders(userId, 4),
      this.getPortfolioValue(userId),
      this.getUserStatistics(userId),
    ]);

    return {
      topHeld,
      topBought,
      recentHolds,
      recentOrders,
      portfolioValue,
      statistics,
    };
  }

  /**
   * Get top 4 medicines currently held by trader
   */
  async getTopHeld(userId: string, limit = 4) {
    const holds = await this.prisma.hold.findMany({
      where: {
        traderId: userId,
        status: 'ACTIVE',
      },
      orderBy: { qty: 'desc' },
      take: limit,
      include: {
        listing: {
          include: {
            medicine: {
              include: {
                manufacturer: true,
              },
            },
          },
        },
      },
    });

    return holds.map((hold) => ({
      id: hold.listing.medicine.id,
      name: hold.listing.medicine.name,
      form: hold.listing.medicine.form,
      strength: hold.listing.medicine.strength,
      manufacturer: hold.listing.medicine.manufacturer.name,
      heldQty: hold.qty,
      value: Number(hold.paidAmount),
      holdStartAt: hold.holdStartAt,
      autoDeliveryAt: hold.autoDeliveryAt,
    }));
  }

  /**
   * Get top 4 most bought medicines by quantity
   */
  async getTopBought(userId: string, limit = 4) {
    const orders = await this.prisma.order.groupBy({
      by: ['listingId'],
      where: {
        buyerId: userId,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: {
        qty: true,
        amount: true,
      },
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: limit,
    });

    const listingIds = orders.map((o) => o.listingId);

    const listings = await this.prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });

    const listingMap = new Map(listings.map((l) => [l.id, l]));

    return orders
      .map((order) => {
        const listing = listingMap.get(order.listingId);
        if (!listing) return null;
        return {
          id: listing.medicine.id,
          name: listing.medicine.name,
          form: listing.medicine.form,
          strength: listing.medicine.strength,
          manufacturer: listing.medicine.manufacturer.name,
          boughtQty: order._sum.qty,
          amount: Number(order._sum.amount),
        };
      })
      .filter((item) => item !== null);
  }

  /**
   * Get recent holds
   */
  async getRecentHolds(userId: string, limit = 4) {
    const holds = await this.prisma.hold.findMany({
      where: {
        traderId: userId,
        status: 'ACTIVE',
      },
      orderBy: { holdStartAt: 'desc' },
      take: limit,
      include: {
        listing: {
          include: {
            medicine: {
              include: {
                manufacturer: true,
              },
            },
            seller: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return holds.map((hold) => ({
      id: hold.id,
      medicineId: hold.listing.medicine.id,
      medicineName: `${hold.listing.medicine.name} ${hold.listing.medicine.strength}`,
      manufacturer: hold.listing.medicine.manufacturer.name,
      seller: hold.listing.seller.name,
      qty: hold.qty,
      paidAmount: Number(hold.paidAmount),
      holdStartAt: hold.holdStartAt,
      autoDeliveryAt: hold.autoDeliveryAt,
      daysRemaining: Math.ceil(
        (hold.autoDeliveryAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(userId: string, limit = 4) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        listing: {
          include: {
            medicine: {
              include: {
                manufacturer: true,
              },
            },
            seller: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      medicineId: order.listing.medicine.id,
      medicineName: `${order.listing.medicine.name} ${order.listing.medicine.strength}`,
      manufacturer: order.listing.medicine.manufacturer.name,
      seller: order.listing.seller.name,
      qty: order.qty,
      unitPrice: Number(order.unitPrice),
      amount: Number(order.amount),
      type: order.type,
      status: order.status,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Calculate portfolio value
   */
  async getPortfolioValue(userId: string) {
    const [activeHolds, completedOrders, inventory] = await Promise.all([
      this.prisma.hold.findMany({
        where: {
          traderId: userId,
          status: 'ACTIVE',
        },
        select: {
          paidAmount: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          buyerId: userId,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        },
        select: {
          amount: true,
        },
      }),
      this.prisma.inventoryLot.groupBy({
        by: ['medicineId'],
        where: { userId },
        _sum: {
          qty: true,
        },
      }),
    ]);

    const totalHoldsValue = activeHolds.reduce(
      (sum, hold) => sum + Number(hold.paidAmount),
      0,
    );

    const totalPurchases = completedOrders.reduce(
      (sum, order) => sum + Number(order.amount),
      0,
    );

    const totalInventoryItems = inventory.reduce(
      (sum, item) => sum + (item._sum.qty || 0),
      0,
    );

    return {
      totalHoldsValue,
      totalPurchases,
      totalInventoryItems,
      uniqueMedicines: inventory.length,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string) {
    const [
      totalOrders,
      totalHolds,
      watchlistCount,
      priceAlertsCount,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.order.count({ where: { buyerId: userId } }),
      this.prisma.hold.count({
        where: { traderId: userId, status: 'ACTIVE' },
      }),
      this.prisma.watchlist.count({ where: { userId } }),
      this.prisma.priceAlert.count({
        where: { userId, isActive: true },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      totalOrders,
      totalHolds,
      watchlistCount,
      priceAlertsCount,
      unreadNotifications,
    };
  }

  /**
   * Get seller dashboard data
   */
  async getSellerDashboard(userId: string) {
    const [
      activeListings,
      pendingListings,
      totalRevenue,
      ordersReceived,
      topSellingMedicines,
    ] = await Promise.all([
      this.prisma.listing.count({
        where: { sellerId: userId, status: 'ACTIVE' },
      }),
      this.prisma.listing.count({
        where: { sellerId: userId, status: 'PENDING' },
      }),
      this.getTotalRevenue(userId),
      this.getOrdersReceived(userId),
      this.getTopSellingMedicines(userId, 5),
    ]);

    return {
      activeListings,
      pendingListings,
      totalRevenue,
      ordersReceived,
      topSellingMedicines,
    };
  }

  /**
   * Calculate total revenue for seller
   */
  async getTotalRevenue(sellerId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        listing: { sellerId },
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      },
      select: {
        amount: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.amount), 0);

    return totalRevenue;
  }

  /**
   * Get orders received count
   */
  async getOrdersReceived(sellerId: string) {
    const [todayCount, totalCount, weekCount] = await Promise.all([
      this.prisma.order.count({
        where: {
          listing: { sellerId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.order.count({
        where: {
          listing: { sellerId },
        },
      }),
      this.prisma.order.count({
        where: {
          listing: { sellerId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      today: todayCount,
      total: totalCount,
      thisWeek: weekCount,
    };
  }

  /**
   * Get top selling medicines for seller
   */
  async getTopSellingMedicines(sellerId: string, limit = 5) {
    const orders = await this.prisma.order.groupBy({
      by: ['listingId'],
      where: {
        listing: { sellerId },
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: {
        qty: true,
        amount: true,
      },
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: limit,
    });

    const listingIds = orders.map((o) => o.listingId);

    const listings = await this.prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });

    const listingMap = new Map(listings.map((l) => [l.id, l]));

    return orders
      .map((order) => {
        const listing = listingMap.get(order.listingId);
        if (!listing) return null;
        return {
          medicineId: listing.medicine.id,
          name: listing.medicine.name,
          form: listing.medicine.form,
          strength: listing.medicine.strength,
          manufacturer: listing.medicine.manufacturer.name,
          soldQty: order._sum.qty,
          revenue: Number(order._sum.amount),
        };
      })
      .filter((item) => item !== null);
  }

  /**
   * Get recently listed medicines (for browse page)
   */
  async getRecentListings(limit = 10) {
    const listings = await this.prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { activatedAt: 'desc' },
      take: limit,
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
        seller: {
          select: {
            name: true,
          },
        },
      },
    });

    return listings.map((listing) => ({
      id: listing.id,
      medicineId: listing.medicine.id,
      medicineName: `${listing.medicine.name} ${listing.medicine.strength}`,
      form: listing.medicine.form,
      manufacturer: listing.medicine.manufacturer.name,
      seller: listing.seller.name,
      price: Number(listing.listPrice),
      stock: listing.stock,
      listedAt: listing.activatedAt,
    }));
  }

  /**
   * Get platform-wide most bought medicines (not user-specific)
   */
  async getPlatformMostBought(limit = 8) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get medicines with most orders across the platform
    const orderStats = await this.prisma.order.groupBy({
      by: ['listingId'],
      where: {
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: {
        qty: true,
        amount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: limit * 2,
    });

    const listingIds = orderStats.map((o) => o.listingId);

    const listings = await this.prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });

    const listingMap = new Map(listings.map((l) => [l.id, l]));

    // Deduplicate by medicine ID and aggregate
    const medicineMap = new Map<string, any>();

    for (const order of orderStats) {
      const listing = listingMap.get(order.listingId);
      if (!listing) continue;

      const medicineId = listing.medicine.id;
      if (medicineMap.has(medicineId)) {
        const existing = medicineMap.get(medicineId);
        existing.totalQty += order._sum.qty || 0;
        existing.totalAmount += Number(order._sum.amount || 0);
        existing.orderCount += order._count;
      } else {
        medicineMap.set(medicineId, {
          id: listing.medicine.id,
          name: listing.medicine.name,
          form: listing.medicine.form,
          strength: listing.medicine.strength,
          manufacturer: listing.medicine.manufacturer?.name || 'Unknown',
          currentPrice: Number(listing.listPrice || listing.basePrice || 0),
          totalQty: order._sum.qty || 0,
          totalAmount: Number(order._sum.amount || 0),
          orderCount: order._count,
        });
      }
    }

    return Array.from(medicineMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit);
  }

  /**
   * Get trending medicines (most watched/bought recently)
   */
  async getTrendingMedicines(limit = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        listings: {
          some: { status: 'ACTIVE' },
        },
      },
      include: {
        manufacturer: true,
        watchlists: {
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
        },
        listings: {
          where: { status: 'ACTIVE' },
          orderBy: { listPrice: 'asc' },
          take: 1,
          include: {
            orders: {
              where: {
                createdAt: { gte: sevenDaysAgo },
              },
            },
          },
        },
      },
      take: limit * 2, // Fetch more than needed for sorting
    });

    // Sort by activity (watchlists + orders)
    const sorted = trending
      .map((medicine) => {
        const watchlistCount = medicine.watchlists.length;
        const orderCount = medicine.listings[0]?.orders.length || 0;
        const activityScore = watchlistCount * 2 + orderCount; // Weight watchlists higher

        return {
          medicineId: medicine.id,
          name: medicine.name,
          form: medicine.form,
          strength: medicine.strength,
          manufacturer: medicine.manufacturer.name,
          currentPrice: medicine.listings[0]?.listPrice
            ? Number(medicine.listings[0].listPrice)
            : null,
          stock: medicine.listings[0]?.stock || 0,
          watchlistCount,
          orderCount,
          activityScore,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit);

    return sorted;
  }
}
