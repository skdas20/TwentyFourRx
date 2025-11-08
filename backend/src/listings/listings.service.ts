import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { MinioService } from '../common/services/minio.service';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async createListing(
    sellerId: string,
    medicineReferenceId: string,
    basePrice: number,
    stock: number,
    document?: Express.Multer.File,
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

    // Upload document if provided
    let documentUrl: string | undefined;
    if (document) {
      try {
        console.log('📤 Uploading document:', document.originalname, 'Size:', document.size);
        documentUrl = await this.minioService.uploadFile(document, 'listing-documents');
        console.log('✅ Document uploaded successfully:', documentUrl);
      } catch (error) {
        console.error('❌ Failed to upload document:', error);
        throw new BadRequestException(`Failed to upload document: ${error.message}`);
      }
    }

    // Create listing directly
    const listing = await this.prisma.listing.create({
      data: {
        medicineId: medicine.id,
        sellerId,
        basePrice,
        stock,
        documentUrl,
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

  async getPendingProposals() {
    return this.prisma.medicineProposal.findMany({
      where: { status: 'PENDING' },
      include: {
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

  async approveMedicineProposal(proposalId: string) {
    try {
      const proposal = await this.prisma.medicineProposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal) {
        throw new NotFoundException('Medicine proposal not found');
      }

      if (proposal.status !== 'PENDING') {
        throw new BadRequestException('Proposal already processed');
      }

      // Validate proposal data
      if (!proposal.name || !proposal.form || !proposal.manufacturerName) {
        throw new BadRequestException('Invalid proposal data: missing required fields');
      }

      if (!proposal.basePrice || Number(proposal.basePrice) <= 0) {
        throw new BadRequestException('Invalid proposal data: basePrice must be greater than 0');
      }

      // Find or create manufacturer
      let manufacturer = await this.prisma.manufacturer.findFirst({
        where: { name: proposal.manufacturerName },
      });

      if (!manufacturer) {
        manufacturer = await this.prisma.manufacturer.create({
          data: { name: proposal.manufacturerName },
        });
      }

      // Find or create marketer (if provided)
      let marketerId: string | undefined = undefined;
      if (proposal.marketerName && proposal.marketerName.trim() !== '') {
        let marketer = await this.prisma.marketer.findFirst({
          where: { name: proposal.marketerName },
        });

        if (!marketer) {
          marketer = await this.prisma.marketer.create({
            data: { name: proposal.marketerName },
          });
        }
        marketerId = marketer.id;
      }

      // Create the medicine
      const medicine = await this.prisma.medicine.create({
        data: {
          name: proposal.name,
          form: proposal.form,
          strength: proposal.strength,
          manufacturerId: manufacturer.id,
          ...(marketerId && { marketerId }), // Only include if marketerId exists
        },
      });

      // Create the listing
      const listing = await this.prisma.listing.create({
        data: {
          medicineId: medicine.id,
          sellerId: proposal.sellerId,
          basePrice: Number(proposal.basePrice),
          stock: 100, // Default stock, seller can update later
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

      // Update proposal status
      await this.prisma.medicineProposal.update({
        where: { id: proposalId },
        data: { status: 'APPROVED' },
      });

      return {
        message: 'Medicine proposal approved and listing created',
        medicine,
        listing,
      };
    } catch (error) {
      // If it's already a known error type, re-throw it
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Log the error and throw a more user-friendly message
      console.error('Error approving medicine proposal:', error);
      throw new BadRequestException(
        `Failed to approve medicine proposal: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async rejectMedicineProposal(proposalId: string, reviewerNote: string) {
    const proposal = await this.prisma.medicineProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Medicine proposal not found');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Proposal already processed');
    }

    const updated = await this.prisma.medicineProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        reviewerNote,
      },
    });

    return { message: 'Medicine proposal rejected', proposal: updated };
  }
}
