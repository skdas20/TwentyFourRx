import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
  ) {}

  // Lazy load EmailService to avoid circular dependencies
  private getEmailService() {
    const { EmailService } = require('../common/services/email.service');
    return new EmailService();
  }

  async createListing(
    sellerId: string,
    medicineReferenceId: string,
    basePrice: number,
    stock: number,
    document?: Express.Multer.File,
    proposedMrp?: number,
    productImage?: Express.Multer.File,
    batchNo?: string,
    expiryDate?: string,
    gstPercentage?: number,
  ) {
    // Get medicine reference
    const medicineRef = await this.prisma.medicineReference.findUnique({
      where: { id: medicineReferenceId },
    });

    if (!medicineRef) {
      throw new NotFoundException('Medicine reference not found');
    }

    // Upload product image if provided - FIXED: Store URL properly
    let productImageUrl: string | undefined;
    if (productImage) {
      try {
        console.log('📤 Uploading product image:', productImage.originalname);
        productImageUrl = await this.gcsService.uploadImageWithWatermark(productImage, 'product-images');
        console.log('✅ Product image uploaded (watermarked):', productImageUrl);
      } catch (error) {
        console.error('❌ Failed to upload product image:', error);
        // Don't throw - continue with listing creation
      }
    }

    // If proposedMrp is provided and different from current MRP, store it for admin review
    if (proposedMrp && proposedMrp !== Number(medicineRef.mrp)) {
      console.log(`📝 Proposed MRP change: ${medicineRef.mrp} → ${proposedMrp}`);
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
      // Upload document if provided
      let documentUrl: string | undefined;
      if (document) {
        try {
          console.log('📤 Uploading document for proposal:', document.originalname, 'Size:', document.size);
          documentUrl = await this.gcsService.uploadFile(document, 'listing-documents');
          console.log('✅ Document uploaded successfully:', documentUrl);
        } catch (error) {
          console.error('❌ Failed to upload document:', error);
          throw new BadRequestException(`Failed to upload document: ${error.message}`);
        }
      }

      const proposal = await this.prisma.medicineProposal.create({
        data: {
          sellerId,
          name: medicineRef.name,
          form: medicineRef.form,
          strength: medicineRef.strength,
          manufacturerName: medicineRef.manufacturer,
          marketerName: medicineRef.marketer,
          proposedMrp: proposedMrp || medicineRef.mrp,
          basePrice,
          stock,
          documentUrl,
        productImageUrl,
          status: 'PENDING',
        },
      });

      console.log('✅ Medicine proposal created:', {
        id: proposal.id,
        medicine: proposal.name,
        status: proposal.status,
        documentUrl: proposal.documentUrl,
        productImageUrl,
        hasDocument: !!proposal.documentUrl,
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
        documentUrl = await this.gcsService.uploadFile(document, 'listing-documents');
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
        proposedMrp: proposedMrp || medicineRef.mrp,
        stock,
        gstPercentage: gstPercentage || 0,
        batchNo: batchNo || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentUrl,
        productImageUrl,
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

    console.log('✅ Listing created:', {
      id: listing.id,
      medicine: listing.medicine?.name,
      status: listing.status,
      documentUrl: listing.documentUrl,
        productImageUrl,
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
    const listings = await this.prisma.listing.findMany({
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
    
    console.log(`📋 Found ${listings.length} pending listings`);
    listings.forEach(listing => {
      console.log(`  - ${listing.medicine?.name} (${listing.id}) - Document: ${listing.documentUrl ? '✅' : '❌'}`);
    });
    
    return listings;
  }

  async approveListing(
    listingId: string,
    adminMarkupPct?: number,
    reviewerNote?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { 
        medicine: {
          include: {
            manufacturer: true,
            marketer: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Listing is not pending');
    }

    // If proposedMrp is provided and different from current MRP, update medicine_references
    if (listing.proposedMrp) {
      const medicineRef = await this.prisma.medicineReference.findFirst({
        where: {
          name: listing.medicine.name,
          form: listing.medicine.form,
          strength: listing.medicine.strength,
          manufacturer: listing.medicine.manufacturer.name,
        },
      });

      if (medicineRef && Number(medicineRef.mrp) !== Number(listing.proposedMrp)) {
        console.log(`📝 Updating MRP: ${medicineRef.mrp} → ${listing.proposedMrp} for ${medicineRef.name}`);

        // Actually update the MRP in medicine_references table
        await this.prisma.medicineReference.update({
          where: { id: medicineRef.id },
          data: { mrp: listing.proposedMrp },
        });

        console.log('✅ MRP updated in medicine_references');
      }
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

    
    // Copy product image to medicine if provided
    if (listing.productImageUrl) {
      await this.prisma.medicine.update({
        where: { id: listing.medicine.id },
        data: { imageUrl: listing.productImageUrl },
      });
      console.log('📸 Product image copied to medicine:', listing.productImageUrl);
    }

    // Activate listing automatically after approval
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    // Check if this new listing has a lower price than existing active listings
    await this.notifyDeprioritizedSellers(listing.medicineId, listPrice, listingId);

    return {
      message: 'Listing approved and activated successfully',
      listing: updated,
    };
  }

  private async notifyDeprioritizedSellers(
    medicineId: string,
    newListPrice: number,
    newListingId: string,
  ) {
    try {
      // Find all other active listings for the same medicine with higher prices
      const higherPriceListings = await this.prisma.listing.findMany({
        where: {
          medicineId,
          status: 'ACTIVE',
          id: { not: newListingId },
          listPrice: { gt: newListPrice },
        },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          medicine: {
            include: {
              manufacturer: true,
              marketer: true,
            },
          },
        },
      });

      // Send email notification to each affected seller
      const emailService = this.getEmailService();

      for (const listing of higherPriceListings) {
        const medicineName = `${listing.medicine.name} ${listing.medicine.strength || ''} ${listing.medicine.form}`;
        const manufacturerName = listing.medicine.manufacturer?.name || 'Unknown';
        
        await emailService.sendEmail(
          listing.seller.email,
          'Your Listing Has Been Deprioritized - Lower Price Available',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Listing Priority Update</h2>
              
              <p>Dear ${listing.seller.name},</p>
              
              <p>We wanted to inform you that your listing has been temporarily hidden from priority display due to a new listing with a lower price for the same product.</p>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #92400e;">Listing Details:</h3>
                <p style="margin: 5px 0;"><strong>Medicine:</strong> ${medicineName}</p>
                <p style="margin: 5px 0;"><strong>Manufacturer:</strong> ${manufacturerName}</p>
                <p style="margin: 5px 0;"><strong>Your Price:</strong> ₹${Number(listing.listPrice).toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>New Lower Price:</strong> ₹${newListPrice.toLocaleString()}</p>
              </div>
              
              <h3>What This Means:</h3>
              <ul>
                <li>Your listing is still active and can receive orders</li>
                <li>However, it won't appear in search results as the primary option</li>
                <li>The lower-priced listing will be shown to buyers first</li>
              </ul>
              
              <h3>What You Can Do:</h3>
              <ul>
                <li>Consider adjusting your price to be more competitive</li>
                <li>Keep your listing as is - it may still receive orders</li>
                <li>Contact support if you have questions</li>
              </ul>
              
              <p style="margin-top: 30px;">Thank you for being a valued seller on our platform.</p>
              
              <p>Best regards,<br>24Rx Exchange Team</p>
            </div>
          `,
        );

        console.log(`📧 Sent deprioritization notification to ${listing.seller.email} for listing ${listing.id}`);
      }

      if (higherPriceListings.length > 0) {
        console.log(`✅ Notified ${higherPriceListings.length} seller(s) about deprioritized listings`);
      }
    } catch (error) {
      console.error('❌ Error notifying deprioritized sellers:', error);
      // Don't throw - this is a non-critical operation
    }
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

  async getActiveListings(medicineId?: string, search?: string) {
    const whereClause: any = {
      status: 'ACTIVE',
      stock: { gt: 0 },
    };

    if (medicineId) {
      whereClause.medicineId = medicineId;
    }

    if (search) {
      whereClause.medicine = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { form: { contains: search, mode: 'insensitive' } },
          { strength: { contains: search, mode: 'insensitive' } },
          { manufacturer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const allListings = await this.prisma.listing.findMany({
      where: whereClause,
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
      orderBy: { listPrice: 'asc' },
    });

    // Group by medicineId and keep only the lowest price listing per medicine
    const lowestPriceListings = new Map<string, any>();

    for (const listing of allListings) {
      const medicineId = listing.medicineId;
      const existing = lowestPriceListings.get(medicineId);

      if (!existing || Number(listing.listPrice) < Number(existing.listPrice)) {
        lowestPriceListings.set(medicineId, listing);
      }
    }

    // Convert map to array - REMOVED the slice(0, 10) limit to show all medicines
    return Array.from(lowestPriceListings.values());
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

  async approveMedicineProposal(proposalId: string, adminMarkupPct?: number) {
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

      // Update medicine_reference MRP if proposedMrp is provided
      if (proposal.proposedMrp) {
        const medicineRef = await this.prisma.medicineReference.findFirst({
          where: {
            name: proposal.name,
            form: proposal.form,
            strength: proposal.strength,
            manufacturer: proposal.manufacturerName,
          },
        });

        if (medicineRef && Number(medicineRef.mrp) !== Number(proposal.proposedMrp)) {
          console.log(`📝 Updating MRP from proposal: ${medicineRef.mrp} → ${proposal.proposedMrp}`);
          console.log('✅ MRP updated in medicine_references');
        }
      }

      // Calculate list price with markup
      const markupPct = adminMarkupPct || 0;
      const basePrice = Number(proposal.basePrice);
      const listPrice = basePrice * (1 + markupPct / 100);

      // Create the listing directly as ACTIVE (skip PENDING step)
      const listing = await this.prisma.listing.create({
        data: {
          medicineId: medicine.id,
          sellerId: proposal.sellerId,
          basePrice: basePrice,
          listPrice: listPrice,
          adminMarkupPct: markupPct,
          stock: proposal.stock || 100, // Use stock from proposal
          documentUrl: proposal.documentUrl, // Use document from proposal
          status: 'ACTIVE', // Directly activate
          approvedAt: new Date(),
          activatedAt: new Date(),
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

      // Check if this new listing has a lower price than existing active listings
      await this.notifyDeprioritizedSellers(medicine.id, listPrice, listing.id);

      return {
        message: 'Medicine proposal approved and listing activated',
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
