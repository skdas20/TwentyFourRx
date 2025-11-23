import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { MinioService } from '../common/services/minio.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BuyProposalsService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async createProposal(
    buyerId: string,
    listingId: string,
    qty: number,
    orderType: string,
    receipt?: Express.Multer.File,
  ) {
    // Validate listing exists and has stock
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
      throw new BadRequestException(`Only ${listing.stock} units available`);
    }

    // Upload receipt if provided
    let receiptUrl: string | undefined;
    if (receipt) {
      try {
        receiptUrl = await this.minioService.uploadFile(receipt, 'buy-receipts');
      } catch (error) {
        console.error('Failed to upload receipt:', error);
        throw new BadRequestException('Failed to upload receipt');
      }
    }

    // Create buy proposal
    const proposal = await this.prisma.buyProposal.create({
      data: {
        buyerId,
        listingId,
        qty,
        orderType,
        receiptUrl,
        status: 'PENDING',
      },
      include: {
        listing: {
          include: {
            medicine: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Buy proposal submitted successfully. Waiting for admin approval.',
      proposal,
    };
  }

  async getPendingProposals() {
    return this.prisma.buyProposal.findMany({
      where: { status: 'PENDING' },
      include: {
        listing: {
          include: {
            medicine: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyProposals(buyerId: string) {
    return this.prisma.buyProposal.findMany({
      where: { buyerId },
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

  async approveProposal(proposalId: string, reviewerNote?: string) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
      include: {
        listing: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Proposal already processed');
    }

    // Create order based on order type
    let order;
    if (proposal.orderType === 'mtf') {
      // Create hold for MTF
      const hold = await this.prisma.hold.create({
        data: {
          traderId: proposal.buyerId,
          listingId: proposal.listingId,
          qty: proposal.qty,
          paidAmount: Number(proposal.listing.listPrice || proposal.listing.basePrice) * proposal.qty,
          holdStartAt: new Date(),
          autoDeliveryAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          status: 'ACTIVE',
        },
      });

      // Update proposal
      await this.prisma.buyProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPROVED',
          reviewerNote,
          reviewedAt: new Date(),
        },
      });

      return {
        message: 'Buy proposal approved and MTF hold created',
        hold,
      };
    } else {
      // Create regular order for delivery/intraday
      order = await this.prisma.order.create({
        data: {
          buyerId: proposal.buyerId,
          listingId: proposal.listingId,
          qty: proposal.qty,
          unitPrice: proposal.listing.listPrice || proposal.listing.basePrice,
          amount: Number(proposal.listing.listPrice || proposal.listing.basePrice) * proposal.qty,
          type: 'BUY',
          status: 'CREATED',
        },
      });

      // Create inventory lot for the buyer
      await this.prisma.inventoryLot.create({
        data: {
          userId: proposal.buyerId,
          medicineId: proposal.listing.medicineId,
          qty: proposal.qty,
          unitCost: new Decimal(proposal.listing.listPrice || proposal.listing.basePrice),
          sourceOrderId: order.id,
        },
      });

      // Update proposal with approved order
      await this.prisma.buyProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPROVED',
          reviewerNote,
          reviewedAt: new Date(),
          approvedOrderId: order.id,
        },
      });

      return {
        message: 'Buy proposal approved and order created',
        order,
      };
    }
  }

  async rejectProposal(proposalId: string, reviewerNote: string) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Proposal already processed');
    }

    await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        reviewerNote,
        reviewedAt: new Date(),
      },
    });

    return { message: 'Buy proposal rejected' };
  }
}
