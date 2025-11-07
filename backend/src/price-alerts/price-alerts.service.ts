import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PriceAlertsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a price alert
   */
  async createPriceAlert(
    userId: string,
    medicineId: string,
    targetPrice: number,
    condition: 'BELOW' | 'ABOVE' | 'EQUALS',
  ) {
    // Check if medicine exists
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
      include: { manufacturer: true },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    const priceAlert = await this.prisma.priceAlert.create({
      data: {
        userId,
        medicineId,
        targetPrice,
        condition,
      },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });

    return priceAlert;
  }

  /**
   * Get all price alerts for a user
   */
  async getUserPriceAlerts(userId: string) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            listings: {
              where: { status: 'ACTIVE' },
              orderBy: { listPrice: 'asc' },
              take: 1,
              select: {
                listPrice: true,
              },
            },
          },
        },
      },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      medicineId: alert.medicineId,
      medicineName: `${alert.medicine.name} (${alert.medicine.form})`,
      manufacturer: alert.medicine.manufacturer.name,
      targetPrice: Number(alert.targetPrice),
      currentPrice: alert.medicine.listings[0]?.listPrice
        ? Number(alert.medicine.listings[0].listPrice)
        : null,
      condition: alert.condition,
      isActive: alert.isActive,
      triggeredAt: alert.triggeredAt,
      createdAt: alert.createdAt,
    }));
  }

  /**
   * Delete a price alert
   */
  async deletePriceAlert(userId: string, alertId: string) {
    const alert = await this.prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Price alert not found');
    }

    if (alert.userId !== userId) {
      throw new BadRequestException('Not authorized to delete this alert');
    }

    await this.prisma.priceAlert.delete({
      where: { id: alertId },
    });

    return { message: 'Price alert deleted successfully' };
  }

  /**
   * Toggle alert active status
   */
  async togglePriceAlert(userId: string, alertId: string, isActive: boolean) {
    const alert = await this.prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Price alert not found');
    }

    if (alert.userId !== userId) {
      throw new BadRequestException('Not authorized to update this alert');
    }

    return this.prisma.priceAlert.update({
      where: { id: alertId },
      data: { isActive },
    });
  }

  /**
   * Check and trigger price alerts (called by a cron job or when prices update)
   */
  async checkAndTriggerAlerts() {
    const activeAlerts = await this.prisma.priceAlert.findMany({
      where: {
        isActive: true,
        triggeredAt: null,
      },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            listings: {
              where: { status: 'ACTIVE' },
              orderBy: { listPrice: 'asc' },
              take: 1,
            },
          },
        },
        user: true,
      },
    });

    const triggeredAlerts: any[] = [];

    for (const alert of activeAlerts) {
      const currentPrice = alert.medicine.listings[0]?.listPrice;

      if (!currentPrice) continue;

      let shouldTrigger = false;
      const currentPriceNum = Number(currentPrice);
      const targetPriceNum = Number(alert.targetPrice);

      switch (alert.condition) {
        case 'BELOW':
          shouldTrigger = currentPriceNum < targetPriceNum;
          break;
        case 'ABOVE':
          shouldTrigger = currentPriceNum > targetPriceNum;
          break;
        case 'EQUALS':
          shouldTrigger = Math.abs(currentPriceNum - targetPriceNum) < 0.01;
          break;
      }

      if (shouldTrigger) {
        // Update alert as triggered
        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggeredAt: new Date(),
            isActive: false,
          },
        });

        // Send notification
        // TODO: Implement createNotification in NotificationsService
        // await this.notificationsService.createNotification({
        //   userId: alert.userId,
        //   channel: 'INAPP',
        //   subject: `Price Alert: ${alert.medicine.name}`,
        //   body: `${alert.medicine.name} (${alert.medicine.manufacturer.name}) is now ₹${currentPriceNum} (${alert.condition} ₹${targetPriceNum})`,
        //   meta: {
        //     type: 'PRICE_ALERT',
        //     medicineId: alert.medicineId,
        //     currentPrice: currentPriceNum,
        //     targetPrice: targetPriceNum,
        //     condition: alert.condition,
        //   },
        // });

        triggeredAlerts.push(alert as any);
      }
    }

    return {
      checked: activeAlerts.length,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    };
  }
}
