import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's inventory with P&L calculations
   */
  async getUserInventory(userId: string) {
    // Get all inventory lots grouped by medicine
    const inventoryLots = await this.prisma.inventoryLot.findMany({
      where: { userId },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            listings: {
              where: { status: 'ACTIVE' },
              orderBy: { listPrice: 'asc' },
              take: 1, // Get cheapest active listing for current market price
              select: {
                listPrice: true,
              },
            },
          },
        },
        sourceOrder: {
          select: {
            id: true,
            invoiceUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by medicine and calculate P&L
    const medicineMap = new Map<string, any>();

    for (const lot of inventoryLots) {
      const medicineId = lot.medicineId;

      if (!medicineMap.has(medicineId)) {
        medicineMap.set(medicineId, {
          medicineId,
          medicineName: lot.medicine.name,
          form: lot.medicine.form,
          strength: lot.medicine.strength,
          manufacturer: lot.medicine.manufacturer.name,
          totalQty: 0,
          totalCost: 0,
          lots: [],
          currentMarketPrice: lot.medicine.listings[0]?.listPrice
            ? Number(lot.medicine.listings[0].listPrice)
            : null,
        });
      }

      const medicineData = medicineMap.get(medicineId);
      medicineData.totalQty += lot.qty;
      medicineData.totalCost += lot.qty * Number(lot.unitCost);
      medicineData.lots.push({
        id: lot.id,
        qty: lot.qty,
        unitCost: Number(lot.unitCost),
        createdAt: lot.createdAt,
        orderId: lot.sourceOrder?.id,
        invoiceUrl: lot.sourceOrder?.invoiceUrl,
      });
    }

    // Calculate P&L for each medicine
    const inventory = Array.from(medicineMap.values()).map((item) => {
      const avgCost = item.totalQty > 0 ? item.totalCost / item.totalQty : 0;
      const currentValue = item.currentMarketPrice
        ? item.currentMarketPrice * item.totalQty
        : item.totalCost;

      const profitLoss = currentValue - item.totalCost;
      const profitLossPercent =
        item.totalCost > 0 ? (profitLoss / item.totalCost) * 100 : 0;

      return {
        ...item,
        avgCost: Number(avgCost.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        profitLoss: Number(profitLoss.toFixed(2)),
        profitLossPercent: Number(profitLossPercent.toFixed(2)),
      };
    });

    // Calculate total portfolio value and P&L
    const totalInvestment = inventory.reduce((sum, item) => sum + item.totalCost, 0);
    const totalCurrentValue = inventory.reduce(
      (sum, item) => sum + item.currentValue,
      0,
    );
    const totalProfitLoss = totalCurrentValue - totalInvestment;
    const totalProfitLossPercent =
      totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    return {
      inventory,
      summary: {
        totalInvestment: Number(totalInvestment.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
        totalProfitLossPercent: Number(totalProfitLossPercent.toFixed(2)),
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.totalQty, 0),
      },
    };
  }

  /**
   * Get inventory history (for charts)
   */
  async getInventoryHistory(userId: string, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const lots = await this.prisma.inventoryLot.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData = new Map<string, { date: string; value: number }>();

    for (const lot of lots) {
      const dateStr = lot.createdAt.toISOString().split('T')[0];
      const value = lot.qty * Number(lot.unitCost);

      if (!dailyData.has(dateStr)) {
        dailyData.set(dateStr, { date: dateStr, value: 0 });
      }

      dailyData.get(dateStr)!.value += value;
    }

    return Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Get expiring inventory (within specified days)
   */
  async getExpiringInventory(userId: string, withinDays = 90) {
    // Note: Expiry tracking would need to be added to InventoryLot model
    // For now, this is a placeholder that returns empty array
    // In a real implementation, you'd add expiryDate field to schema
    return [];
  }

  /**
   * Get low stock inventory (below threshold)
   */
  async getLowStockInventory(userId: string, threshold = 100) {
    const inventory = await this.getUserInventory(userId);

    return inventory.inventory.filter((item) => item.totalQty < threshold);
  }
}
