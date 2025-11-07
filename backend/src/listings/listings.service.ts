import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async createListing(
    sellerId: string,
    medicineReferenceId: string,
    basePrice: number,
    stock: number,
  ) {
    // Get medicine reference
    const medicineRef = await this.prisma.medicineReference.findUnique({
      where: { id: medicineReferenceId },
    });

    if (!medicineRef) {
      throw new NotFoundException('Medicine reference not found');
    }

    // Check if medicine already exists in medicines table
    let medicine = await this.prisma.medicine.findFirst({
      where: {
        name: medicineRef.name,
        form: medicineRef.form,
        strength: medicineRef.strength,
        manufacturer: {
          name: medicineRef.manufacturer,
        },
      },
      include: { manufacturer: true, marketer: true },
    });

    // If medicine doesn't exist, create proposal for admin approval
    if (!medicine) {
      const proposal = await this.prisma.medicineProposal.create({
        data: {
          sellerId,
          name: medicineRef.name,
          form: medicineRef.form,
          strength: medicineRef.strength,
          manufacturerName: medicineRef.manufacturer,
          marketerName: medicineRef.marketer,
          basePrice,
          status: 'PENDING',
        },
      });

      return {
        message: 'Medicine proposal created. Waiting for admin approval.',
        proposal,
        needsApproval: true,
      };
    }

    // Create listing directly
    const listing = await this.prisma.listing.create({
      data: {
        medicineId: medicine.id,
        sellerId,
        basePrice,
        stock,
        status: 'PENDING',
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

    return {
      message: 'Listing created successfully. Waiting for admin approval.',
      listing,
      needsApproval: false,
    };
  }

  async getListingsBySeller(sellerId: string) {
    return this.prisma.listing.findMany({
      where: { sellerId },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingListings() {
    return this.prisma.listing.findMany({
      where: { status: 'PENDING' },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
        seller: {
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

  async approveListing(
    listingId: string,
    adminMarkupPct?: number,
    reviewerNote?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { medicine: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Listing is not pending');
    }

    const markupPct = adminMarkupPct || 0;
    const basePrice = listing.basePrice.toNumber();
    const listPrice = basePrice * (1 + markupPct / 100);

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'APPROVED',
        adminMarkupPct: markupPct,
        listPrice,
        reviewerNote,
        approvedAt: new Date(),
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

    // Activate listing automatically after approval
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    return {
      message: 'Listing approved and activated successfully',
      listing: updated,
    };
  }

  async rejectListing(listingId: string, reviewerNote: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Listing is not pending');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'REJECTED',
        reviewerNote,
      },
    });

    // Restore stock (if was previously deducted)
    // In this flow, stock isn't deducted on creation, so no action needed

    return { message: 'Listing rejected', listing: updated };
  }

  async getActiveListings(medicineId?: string) {
    return this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        ...(medicineId && { medicineId }),
        stock: { gt: 0 },
      },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { listPrice: 'asc' },
    });
  }

  async getListingById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }
}
