import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, listingId: string, qty: number) {
    // Validate listing exists and has enough stock
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { medicine: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing is not active');
    }

    if (listing.stock < qty) {
      throw new BadRequestException(`Only ${listing.stock} units available in stock`);
    }

    // Calculate amount
    const unitPrice = listing.listPrice || listing.basePrice;
    const gstPct = new Decimal(listing.gstPercentage || 0);
    const amount = unitPrice
      .mul(qty)
      .mul(new Decimal(1).add(gstPct.div(100)));

    // Create order
    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        listingId,
        qty,
        unitPrice,
        amount,
        type: 'BUY',
        status: 'CREATED',
      },
      include: {
        listing: {
          include: {
            medicine: true,
          },
        },
      },
    });

    // Update listing stock
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { stock: { decrement: qty } },
    });

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        listing: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
