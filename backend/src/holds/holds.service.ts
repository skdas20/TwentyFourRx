import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class HoldsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('holds') private holdsQueue: Queue,
  ) {}

  async createHold(traderId: string, listingId: string, qty: number) {
    // Validate listing exists and has enough stock
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        medicine: true,
        seller: { select: { name: true, email: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing is not active');
    }

    if (listing.stock < qty) {
      throw new BadRequestException(`Insufficient stock. Available: ${listing.stock}`);
    }

    // Calculate price
    const listPrice = listing.listPrice || listing.basePrice;
    const paidAmount = listPrice.toNumber() * qty;

    // Calculate auto-delivery date (10 days from now)
    const autoDeliveryAt = new Date();
    autoDeliveryAt.setDate(autoDeliveryAt.getDate() + 10);

    // Create hold
    const hold = await this.prisma.hold.create({
      data: {
        traderId,
        listingId,
        qty,
        paidAmount,
        autoDeliveryAt,
        status: 'ACTIVE',
      },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { name: true } },
          },
        },
      },
    });

    // Reduce listing stock
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { stock: { decrement: qty } },
    });

    // Schedule auto-delivery job
    const delay = autoDeliveryAt.getTime() - Date.now();
    await this.holdsQueue.add(
      'auto-deliver',
      { holdId: hold.id },
      { delay },
    );

    return {
      message: 'Hold created successfully. Auto-delivery in 10 days.',
      hold,
      autoDeliveryAt,
    };
  }

  async getHoldsByTrader(traderId: string) {
    return this.prisma.hold.findMany({
      where: { traderId },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { name: true, email: true } },
          },
        },
        convertedOrder: true,
      },
      orderBy: { holdStartAt: 'desc' },
    });
  }

  async getAllHolds() {
    return this.prisma.hold.findMany({
      include: {
        trader: { select: { id: true, name: true, email: true } },
        listing: {
          include: {
            medicine: true,
            seller: { select: { name: true } },
          },
        },
        convertedOrder: true,
      },
      orderBy: { holdStartAt: 'desc' },
    });
  }

  async cancelHold(holdId: string, traderId: string) {
    const hold = await this.prisma.hold.findUnique({
      where: { id: holdId },
      include: { listing: true },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found');
    }

    if (hold.traderId !== traderId) {
      throw new BadRequestException('You can only cancel your own holds');
    }

    if (hold.status !== 'ACTIVE') {
      throw new BadRequestException(`Hold is already ${hold.status}`);
    }

    // Update hold status
    await this.prisma.hold.update({
      where: { id: holdId },
      data: { status: 'CANCELLED' },
    });

    // Restore stock to listing
    await this.prisma.listing.update({
      where: { id: hold.listingId },
      data: { stock: { increment: hold.qty } },
    });

    return { message: 'Hold cancelled successfully' };
  }

  async convertHoldToOrder(holdId: string) {
    const hold = await this.prisma.hold.findUnique({
      where: { id: holdId },
      include: {
        listing: {
          include: { medicine: true },
        },
        trader: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found');
    }

    if (hold.status !== 'ACTIVE') {
      throw new BadRequestException(`Hold is ${hold.status}, cannot convert`);
    }

    const paidAmountNum = hold.paidAmount.toNumber();
    const unitPrice = paidAmountNum / hold.qty;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        buyerId: hold.traderId,
        listingId: hold.listingId,
        qty: hold.qty,
        unitPrice,
        amount: hold.paidAmount,
        type: 'BUY',
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Update hold
    await this.prisma.hold.update({
      where: { id: holdId },
      data: {
        status: 'CONVERTED',
        convertedOrderId: order.id,
      },
    });

    // Create inventory lot for trader
    await this.prisma.inventoryLot.create({
      data: {
        userId: hold.traderId,
        medicineId: hold.listing.medicine.id,
        qty: hold.qty,
        unitCost: unitPrice,
        sourceOrderId: order.id,
      },
    });

    // Send notification
    await this.prisma.notification.create({
      data: {
        userId: hold.traderId,
        channel: 'INAPP',
        subject: '🚚 Auto-Delivery Complete',
        body: `Your hold for ${hold.listing.medicine.name} has been automatically converted to an order and delivered to your inventory.`,
        meta: { holdId, orderId: order.id },
      },
    });

    return { message: 'Hold converted to order successfully', order };
  }
}
