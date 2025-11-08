import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    // Get total revenue from completed orders
    const revenueData = await this.prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'DELIVERED'] },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get previous month revenue for comparison
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const previousRevenueData = await this.prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'DELIVERED'] },
        createdAt: { lt: thirtyDaysAgo },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Calculate revenue change
    const totalRevenue = Number(revenueData._sum.amount || 0);
    const previousRevenue = Number(previousRevenueData._sum.amount || 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : '0';

    // Get total orders
    const totalOrders = revenueData._count;
    const previousOrders = previousRevenueData._count;
    const ordersChange = previousOrders > 0
      ? ((totalOrders - previousOrders) / previousOrders * 100).toFixed(1)
      : '0';

    // Get active users (approved and active)
    const activeUsers = await this.prisma.user.count({
      where: {
        status: 'APPROVED',
        isActive: true,
      },
    });

    // Get previous active users count
    const previousActiveUsers = await this.prisma.user.count({
      where: {
        status: 'APPROVED',
        isActive: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    const usersChange = previousActiveUsers > 0
      ? ((activeUsers - previousActiveUsers) / previousActiveUsers * 100).toFixed(1)
      : '0';

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const previousAvgOrderValue = previousOrders > 0 ? previousRevenue / previousOrders : 0;
    const avgOrderValueChange = previousAvgOrderValue > 0
      ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue * 100).toFixed(1)
      : '0';

    return {
      totalRevenue: {
        value: totalRevenue,
        formatted: `₹${(totalRevenue / 10000000).toFixed(1)}Cr`,
        change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
        trend: Number(revenueChange) >= 0 ? 'up' : 'down',
      },
      totalOrders: {
        value: totalOrders,
        formatted: totalOrders.toLocaleString(),
        change: `${Number(ordersChange) >= 0 ? '+' : ''}${ordersChange}%`,
        trend: Number(ordersChange) >= 0 ? 'up' : 'down',
      },
      activeUsers: {
        value: activeUsers,
        formatted: activeUsers.toLocaleString(),
        change: `${Number(usersChange) >= 0 ? '+' : ''}${usersChange}%`,
        trend: Number(usersChange) >= 0 ? 'up' : 'down',
      },
      avgOrderValue: {
        value: avgOrderValue,
        formatted: `₹${Math.round(avgOrderValue).toLocaleString()}`,
        change: `${Number(avgOrderValueChange) >= 0 ? '+' : ''}${avgOrderValueChange}%`,
        trend: Number(avgOrderValueChange) >= 0 ? 'up' : 'down',
      },
    };
  }
}
