import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { PricesService } from '../prices/prices.service';
import { Decimal } from '@prisma/client/runtime/library';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
    @Inject(forwardRef(() => PricesService))
    private pricesService: PricesService,
    private notificationsService: NotificationsService,
  ) {}

  private serializeListing(listing: any) {
    return {
      ...listing,
      basePrice: Number(listing.basePrice ?? 0),
      listPrice: Number(listing.listPrice ?? listing.basePrice ?? 0),
      gstPercentage: Number(listing.gstPercentage ?? 0),
      proposedMrp:
        listing.proposedMrp === null || listing.proposedMrp === undefined
          ? listing.proposedMrp
          : Number(listing.proposedMrp),
    };
  }

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
    // Try to get medicine reference first
    let medicineRef = await this.prisma.medicineReference.findUnique({
      where: { id: medicineReferenceId },
    });

    // If not found in references, check if it's an existing medicine ID
    if (!medicineRef) {
      const existingMedicine = await this.prisma.medicine.findUnique({
        where: { id: medicineReferenceId },
        include: { manufacturer: true, marketer: true },
      });

      if (existingMedicine) {
        // Create a temporary reference object from the existing medicine
        medicineRef = {
          id: existingMedicine.id,
          name: existingMedicine.name,
          genericName: existingMedicine.genericName,
          composition: existingMedicine.composition || existingMedicine.name,
          form: existingMedicine.form,
          strength: existingMedicine.strength,
          manufacturer: existingMedicine.manufacturer.name,
          marketer: existingMedicine.marketer?.name || null,
          packSize: existingMedicine.packSize,
          mrp: existingMedicine.mrp,
          imageUrl: existingMedicine.imageUrl,
          source: 'existing_medicine' as any,
          sourceId: null,
          lastScrapedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
        };
      } else {
        throw new NotFoundException('Medicine not found in references or medicines table');
      }
    }

    // At this point, medicineRef is guaranteed to exist
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
          gstPercentage: gstPercentage || 0,
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

      // Notify Admins
      const admins = await this.prisma.user.findMany({ where: { roleCode: 'ADMIN' }, select: { id: true } });
      for (const admin of admins) {
        await this.notificationsService.createNotification({
          userId: admin.id,
          channel: 'INAPP',
          subject: '💊 New Medicine Proposal',
          body: `A new medicine proposal for ${proposal.name} has been submitted.`,
          meta: { proposalId: proposal.id, type: 'MEDICINE_PROPOSAL' },
        });
      }

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

    // Notify Admins
    const admins = await this.prisma.user.findMany({ where: { roleCode: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
      await this.notificationsService.createNotification({
        userId: admin.id,
        channel: 'INAPP',
        subject: '📝 New Listing Pending Review',
        body: `A new listing for ${listing.medicine.name} needs review.`,
        meta: { listingId: listing.id, type: 'NEW_LISTING' },
      });
    }

    return {
      message: 'Listing created successfully. Waiting for admin approval.',
      listing,
      needsApproval: false,
    };
  }

  async getListingsBySeller(sellerId: string) {
    // Get both regular listings and medicine proposals
    const [listings, proposals] = await Promise.all([
      this.prisma.listing.findMany({
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
      }),
      this.prisma.medicineProposal.findMany({
        where: {
          sellerId,
          // Exclude APPROVED proposals since they're already shown as ACTIVE listings
          status: { in: ['PENDING', 'REJECTED'] }
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Transform proposals to match listing format for frontend
    const proposalsAsListings = proposals.map((proposal) => ({
      id: proposal.id,
      medicineId: proposal.approvedMedicineId || null,
      sellerId: proposal.sellerId,
      basePrice: proposal.basePrice,
      proposedMrp: proposal.proposedMrp,
      gstPercentage: Number(proposal.gstPercentage) || 0, // Include GST percentage
      stock: proposal.stock,
      status: proposal.status, // PENDING, APPROVED, REJECTED
      documentUrl: proposal.documentUrl,
      productImageUrl: proposal.productImageUrl,
      createdAt: proposal.createdAt,
      isProposal: true, // Flag to identify proposals
      medicine: {
        name: proposal.name,
        form: proposal.form,
        strength: proposal.strength,
        manufacturer: {
          name: proposal.manufacturerName,
        },
        marketer: proposal.marketerName ? {
          name: proposal.marketerName,
        } : null,
      },
    }));

    // Combine and sort by creation date
    return [...listings, ...proposalsAsListings].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    markupType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE',
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

    const markupValue = adminMarkupPct || 0;
    const basePrice = listing.basePrice.toNumber();
    
    // Calculate final price based on markup type
    let listPrice: number;
    if (markupType === 'FIXED') {
      listPrice = basePrice + markupValue;
    } else {
      listPrice = basePrice * (1 + markupValue / 100);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'APPROVED',
        adminMarkupType: markupType,
        adminMarkupPct: markupValue,
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

    // Record price history for this medicine (for graph/trends)
    try {
      await this.pricesService.recordPriceOnListingActivation(listing.medicineId, listPrice);
    } catch (error) {
      console.error('⚠️ Failed to record price history (non-critical):', error.message);
    }

    // Check if this new listing has a lower price than existing active listings
    // Don't let email notification failures block the approval
    try {
      await this.notifyDeprioritizedSellers(listing.medicineId, listPrice, listingId);
    } catch (error) {
      console.error('⚠️ Failed to send deprioritization notifications (non-critical):', error.message);
    }

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

      // Send both in-app notification and email to each affected seller
      const emailService = this.getEmailService();

      for (const listing of higherPriceListings) {
        const medicineName = `${listing.medicine.name} ${listing.medicine.strength || ''} ${listing.medicine.form}`;
        const manufacturerName = listing.medicine.manufacturer?.name || 'Unknown';
        const yourPrice = Number(listing.listPrice);

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            userId: listing.seller.id,
            channel: 'INAPP',
            subject: 'Listing Deprioritized - Lower Price Available',
            body: `Your listing for ${medicineName} at ₹${yourPrice.toLocaleString()} has been deprioritized. A new listing at ₹${newListPrice.toLocaleString()} is now showing first.`,
            meta: {
              type: 'LISTING_DEPRIORITIZED',
              medicineName,
              yourPrice,
              newLowerPrice: newListPrice,
              listingId: listing.id,
            },
            sentAt: new Date(),
          },
        });
        
        // Send email notification asynchronously (non-blocking)
        emailService.sendEmail(
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
                <p style="margin: 5px 0;"><strong>Your Price:</strong> ₹${yourPrice.toLocaleString()}</p>
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
        ).then(() => {
          console.log(`📧 Sent deprioritization notification to ${listing.seller.email} for listing ${listing.id}`);
        }).catch(error => {
          console.error(`Failed to send email to ${listing.seller.email}:`, error);
        });
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

  async uploadMedicineImage(listingId: string, image: Express.Multer.File) {
    // Find the listing
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { medicine: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (!listing.medicine) {
      throw new BadRequestException('Listing has no associated medicine');
    }

    try {
      // Upload image with watermark
      console.log('📤 Uploading medicine image:', image.originalname);
      const imageUrl = await this.gcsService.uploadImageWithWatermark(image, 'medicine-images');
      console.log('✅ Medicine image uploaded (watermarked):', imageUrl);

      // Update the medicine's image URL
      await this.prisma.medicine.update({
        where: { id: listing.medicineId },
        data: { imageUrl },
      });

      return { 
        message: 'Medicine image uploaded successfully', 
        imageUrl,
        medicineId: listing.medicineId,
      };
    } catch (error) {
      console.error('❌ Failed to upload medicine image:', error);
      throw new BadRequestException('Failed to upload medicine image');
    }
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
          { composition: { contains: search, mode: 'insensitive' } },
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

    const uniqueMedicineIds = Array.from(lowestPriceListings.keys());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch history for trend calculation
    const history = await this.prisma.priceHistory.findMany({
      where: {
        medicineId: { in: uniqueMedicineIds },
        day: { gte: thirtyDaysAgo },
      },
      orderBy: { day: 'asc' },
    });

    // Convert map to array and attach trend data
    return Array.from(lowestPriceListings.values()).map((listing) => {
      const serialized = this.serializeListing(listing);
      const medHistory = history.filter((h) => h.medicineId === listing.medicineId);

      let change = 0;
      let changePercent = 0;

      if (medHistory.length > 0) {
        const oldestPrice = Number(medHistory[0].avgPrice);
        const currentPrice = Number(listing.listPrice || listing.basePrice);

        if (oldestPrice > 0) {
          change = currentPrice - oldestPrice;
          changePercent = (change / oldestPrice) * 100;
        }
      }

      return {
        ...serialized,
        change,
        changePercent,
      };
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

    return this.serializeListing(listing);
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
          gstPercentage: Number(proposal.gstPercentage) || 0, // Use GST from proposal
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

      // Copy product image to medicine if provided in proposal
      if (proposal.productImageUrl) {
        await this.prisma.medicine.update({
          where: { id: medicine.id },
          data: { imageUrl: proposal.productImageUrl },
        });
        console.log('📸 Product image copied to medicine from proposal:', proposal.productImageUrl);
      }

      // Update proposal status
      await this.prisma.medicineProposal.update({
        where: { id: proposalId },
        data: { status: 'APPROVED' },
      });

      // Record price history for this medicine (for graph/trends)
      try {
        await this.pricesService.recordPriceOnListingActivation(medicine.id, listPrice);
      } catch (error) {
        console.error('⚠️ Failed to record price history (non-critical):', error.message);
      }

      // Check if this new listing has a lower price than existing active listings
      // Don't let email notification failures block the approval
      try {
        await this.notifyDeprioritizedSellers(medicine.id, listPrice, listing.id);
      } catch (error) {
        console.error('⚠️ Failed to send deprioritization notifications (non-critical):', error.message);
      }

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

  async createBulkListingRequest(
    sellerId: string,
    csvFile: Express.Multer.File,
    documentFile: Express.Multer.File,
  ) {
    // STEP 1: Validate CSV headers IMMEDIATELY (before uploading files)
    const validationResult = await this.validateCsvHeaders(csvFile.buffer);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `Invalid CSV format: ${validationResult.error}\n\nRequired columns: Brand Name, Form, Manufacturer\nOptional columns: Strength, Composition, Batch No, Expiry Date, Stock, GST %, MRP, List Price`
      );
    }

    // STEP 2: Upload files (only if validation passed)
    const csvUrl = await this.gcsService.uploadFile(csvFile, 'bulk-listings/csv');
    const documentUrl = await this.gcsService.uploadFile(
      documentFile,
      'bulk-listings/docs',
    );

    // STEP 3: Create request
    const request = await this.prisma.bulkListingRequest.create({
      data: {
        sellerId,
        csvUrl,
        documentUrl,
        status: 'PENDING',
      },
    });

    // Parse and Analyze CSV in BACKGROUND (non-blocking) - improves response time
    // User gets immediate confirmation while analysis happens asynchronously
    this.analyzeBulkCsv(request.id, csvFile.buffer).catch(err => {
      console.error('Background CSV analysis failed:', err);
    });

    // Notify Admins (also non-blocking)
    const admins = await this.prisma.user.findMany({ where: { roleCode: 'ADMIN' }, select: { id: true } });
    Promise.all(admins.map(admin => 
      this.notificationsService.createNotification({
        userId: admin.id,
        channel: 'INAPP',
        subject: '📦 New Bulk Listing Request',
        body: `A new bulk listing request has been submitted.`,
        meta: { bulkRequestId: request.id, type: 'BULK_LISTING' },
      })
    )).catch(err => console.error('Failed to notify admins:', err));

    return { 
      message: 'Bulk listing request submitted successfully! Analysis is in progress...', 
      request,
      estimatedProcessingTime: '10-30 seconds'
    };
  }

  // Validate CSV headers before processing
  private async validateCsvHeaders(csvBuffer: Buffer): Promise<{ isValid: boolean; error?: string }> {
    try {
      let records: any[];
      
      // Check if it's an Excel file
      const isExcel = csvBuffer[0] === 0xD0 && csvBuffer[1] === 0xCF || 
                      csvBuffer[0] === 0x50 && csvBuffer[1] === 0x4B;
      
      if (isExcel) {
        const workbook = XLSX.read(csvBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(worksheet);
      } else {
        records = parse(csvBuffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      }

      if (!records || records.length === 0) {
        return { isValid: false, error: 'CSV file is empty' };
      }

      // Check for required columns (case-insensitive)
      const firstRow = records[0];
      const headers = Object.keys(firstRow);
      const headersLower = headers.map(h => h.toLowerCase().trim());

      // Required columns (must have at least one variant)
      const requiredColumns = [
        ['brand name', 'brand_name'],
        ['form'],
        ['manufacturer']
      ];

      for (const variants of requiredColumns) {
        const hasColumn = variants.some(variant => 
          headersLower.includes(variant.toLowerCase())
        );
        
        if (!hasColumn) {
          return { 
            isValid: false, 
            error: `Missing required column: "${variants[0]}". Found columns: ${headers.join(', ')}`
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Failed to parse CSV: ${error.message}`
      };
    }
  }

  // Helper function to normalize medicine names for better matching
  private normalizeMedicineName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[-\s]+/g, '') // Remove hyphens and spaces
      .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
  }

  async analyzeBulkCsv(requestId: string, csvBuffer: Buffer) {
    try {
      let records: any[];
      
      // Check if it's an Excel file by looking at file signature
      const isExcel = csvBuffer[0] === 0xD0 && csvBuffer[1] === 0xCF || // .xls
                      csvBuffer[0] === 0x50 && csvBuffer[1] === 0x4B; // .xlsx
      
      if (isExcel) {
        // Parse Excel file
        const workbook = XLSX.read(csvBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(worksheet);
      } else {
        // Parse CSV file
        records = parse(csvBuffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      }

      // PERFORMANCE OPTIMIZATION: Fetch ALL medicines and references ONCE before the loop
      const activeMedicines = await this.prisma.medicine.findMany({
        include: { manufacturer: true },
      });

      const refMedicines = await this.prisma.medicineReference.findMany();

      const parsedRows: any[] = [];

      for (const record of records) {
        const row = record as any;
        const brandName = row['Brand Name'] || row['brand_name'];
        const form = row['Form'] || row['form'];
        const strength = row['Strength'] || row['strength'];
        const manufacturer = row['Manufacturer'] || row['manufacturer'];

        // Basic validation
        if (!brandName || !form || !manufacturer) {
          parsedRows.push({ ...row, status: 'INVALID', error: 'Missing required fields' });
          continue;
        }

        // Normalize inputs for flexible matching
        const normalizedBrand = this.normalizeMedicineName(String(brandName));
        const normalizedForm = String(form).toLowerCase().trim();
        const normalizedStrength = strength ? String(strength).toLowerCase().replace(/\s+/g, '').trim() : '';
        const normalizedManufacturer = String(manufacturer).toLowerCase().trim();

        // 1. Check Active Medicines with flexible matching
        const activeMedicinesFiltered = activeMedicines.filter(med =>
          String(med.form).toLowerCase().trim() === normalizedForm
        );

        let activeMatch = activeMedicinesFiltered.find(med => {
          const medNameNorm = this.normalizeMedicineName(med.name);
          const medStrengthNorm = med.strength ? String(med.strength).toLowerCase().replace(/\s+/g, '').trim() : '';
          const medManufNorm = med.manufacturer?.name?.toLowerCase().trim() || '';

          return medNameNorm === normalizedBrand &&
                 medStrengthNorm === normalizedStrength &&
                 medManufNorm === normalizedManufacturer;
        });

        if (activeMatch) {
          parsedRows.push({
            ...row,
            status: 'MATCHED',
            medicineId: activeMatch.id,
            matchType: 'ACTIVE',
            matchName: activeMatch.name,
          });
          continue;
        }

        // 2. Check Reference Medicines with flexible matching
        const refMedicinesFiltered = refMedicines.filter(ref =>
          String(ref.form).toLowerCase().trim() === normalizedForm
        );

        let refMatch = refMedicinesFiltered.find(ref => {
          const refNameNorm = this.normalizeMedicineName(ref.name);
          const refStrengthNorm = ref.strength ? String(ref.strength).toLowerCase().replace(/\s+/g, '').trim() : '';
          const refManufNorm = ref.manufacturer?.toLowerCase().trim() || '';

          return refNameNorm === normalizedBrand &&
                 refStrengthNorm === normalizedStrength &&
                 refManufNorm === normalizedManufacturer;
        });

        if (refMatch) {
          parsedRows.push({
            ...row,
            status: 'MATCHED',
            medicineId: refMatch.id,
            matchType: 'REFERENCE', // Needs conversion to Medicine
            matchName: refMatch.name,
          });
          continue;
        }

        // 3. No Match
        parsedRows.push({
          ...row,
          status: 'NEW',
        });
      }

      // Update request with parsed data
      const updatedRequest = await this.prisma.bulkListingRequest.update({
        where: { id: requestId },
        data: {
          parsedData: parsedRows,
          status: 'PROCESSED',
        },
        include: { seller: true },
      });

      // NOTIFY SELLER that analysis is complete
      await this.notificationsService.createNotification({
        userId: updatedRequest.sellerId,
        channel: 'INAPP',
        subject: '✅ Bulk Upload Analysis Complete',
        body: `Your bulk upload has been analyzed. Found ${parsedRows.length} items (${parsedRows.filter(r => r.status === 'MATCHED').length} matched, ${parsedRows.filter(r => r.status === 'NEW').length} new, ${parsedRows.filter(r => r.status === 'INVALID').length} invalid). Admin will review shortly.`,
        meta: { bulkRequestId: requestId, type: 'BULK_ANALYSIS_COMPLETE' },
      }).catch(err => console.error('Failed to notify seller:', err));

    } catch (error) {
      console.error('Failed to analyze bulk CSV:', error);
      
      // Update to ERROR status
      const failedRequest = await this.prisma.bulkListingRequest.update({
        where: { id: requestId },
        data: { status: 'ERROR' },
        include: { seller: true },
      });

      // NOTIFY SELLER about the error
      await this.notificationsService.createNotification({
        userId: failedRequest.sellerId,
        channel: 'INAPP',
        subject: '❌ Bulk Upload Analysis Failed',
        body: `There was an error analyzing your bulk upload. Please check the file format and try again, or contact support.`,
        meta: { bulkRequestId: requestId, type: 'BULK_ANALYSIS_ERROR' },
      }).catch(err => console.error('Failed to notify seller about error:', err));
    }
  }

  // Get seller's own bulk listing requests
  async getMyBulkListingRequests(sellerId: string) {
    return this.prisma.bulkListingRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBulkListingRequests(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.bulkListingRequest.findMany({
      where,
      include: {
        seller: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBulkListingRequestById(id: string) {
    return this.prisma.bulkListingRequest.findUnique({
      where: { id },
      include: {
        seller: {
          select: { name: true, email: true },
        },
      },
    });
  }

  async approveBulkListingItems(requestId: string, selectedIndices: number[], markupType: 'PERCENTAGE' | 'FIXED', markupValue: number) {
    const request = await this.prisma.bulkListingRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || !request.parsedData) {
      throw new NotFoundException('Request not found or no data');
    }

    const rows = request.parsedData as any[];
    const results = { created: 0, failed: 0 };

    for (const index of selectedIndices) {
      if (index < 0 || index >= rows.length) continue;
      const row = rows[index];

      try {
        const basePrice = parseFloat(row['List Price'] || row['Unit Rate to 24RX (excl of tax)'] || '0');
        const stock = parseInt(row['Stock'] || '0');
        const gst = parseFloat(row['GST %'] || '0');
        const proposedMrp = parseFloat(row['MRP'] || row['MRP(incl of tax)'] || '0');
        const batchNo = row['Batch No'] || row['BATCH NO.'];
        const expiryDate = row['Expiry Date'] || row['EXPIRY'];

        // Calculate final price based on markup type
        let finalPrice: number;

        if (markupType === 'PERCENTAGE') {
          finalPrice = basePrice * (1 + markupValue / 100);
        } else {
          finalPrice = basePrice + markupValue;
        }

        if (row.status === 'MATCHED') {
          // Determine Medicine ID
          let medicineId = row.medicineId;

          // If matched with reference, we must first ensure Medicine exists
          if (row.matchType === 'REFERENCE') {
             // Re-fetch reference to be safe
             const ref = await this.prisma.medicineReference.findUnique({ where: { id: medicineId }});
             if (ref) {
                // Check/Create Medicine from Reference (Reuse createListing logic implicitly or call simpler method)
                // We'll quickly find/create manufacturer and medicine
                let manufacturer = await this.prisma.manufacturer.findFirst({ where: { name: ref.manufacturer }});
                if (!manufacturer) manufacturer = await this.prisma.manufacturer.create({ data: { name: ref.manufacturer }});
                
                const newMed = await this.prisma.medicine.create({
                  data: {
                    name: ref.name,
                    form: ref.form,
                    strength: ref.strength,
                    manufacturerId: manufacturer.id,
                    mrp: ref.mrp,
                  }
                });
                medicineId = newMed.id;
             }
          }

          // Create Listing with markup
          await this.prisma.listing.create({
            data: {
              medicineId,
              sellerId: request.sellerId,
              basePrice,
              listPrice: finalPrice,
              adminMarkupType: markupType,
              adminMarkupPct: markupValue,
              stock,
              gstPercentage: gst,
              proposedMrp,
              batchNo,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              status: 'ACTIVE',
              approvedAt: new Date(),
              activatedAt: new Date(),
              documentUrl: request.documentUrl,
            }
          });
          results.created++;

        } else if (row.status === 'NEW') {
          // New Medicine -> Create Medicine -> Create Listing
          // 1. Manufacturer
          const mfrName = row['Manufacturer'] || row['Name of Manufacturer'];
          let manufacturer = await this.prisma.manufacturer.findFirst({ where: { name: { equals: mfrName, mode: 'insensitive' } }});
          if (!manufacturer) manufacturer = await this.prisma.manufacturer.create({ data: { name: mfrName }});

          // 2. Medicine
          const newMed = await this.prisma.medicine.create({
            data: {
              name: row['Brand Name'],
              form: row['Form'] || row['Packing Unit']?.split(' ')[0] || 'Tablet', // Fallback parsing
              strength: row['Strength'] || 'N/A',
              composition: row['Composition'] || null,
              manufacturerId: manufacturer.id,
              mrp: proposedMrp,
            }
          });

          // 3. Add to Reference (Sync back)
          await this.prisma.medicineReference.create({
            data: {
              name: newMed.name,
              form: newMed.form,
              strength: newMed.strength,
              manufacturer: mfrName,
              composition: row['Composition'] || 'N/A',
              mrp: proposedMrp,
              source: 'bulk_upload',
              isActive: true,
            }
          });

          // 4. Listing with markup
          await this.prisma.listing.create({
            data: {
              medicineId: newMed.id,
              sellerId: request.sellerId,
              basePrice,
              listPrice: finalPrice,
              adminMarkupType: markupType,
              adminMarkupPct: markupValue,
              stock,
              gstPercentage: gst,
              proposedMrp,
              batchNo,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              status: 'ACTIVE',
              approvedAt: new Date(),
              activatedAt: new Date(),
              documentUrl: request.documentUrl,
            }
          });
          results.created++;
        }
      } catch (e) {
        console.error('Failed to create listing from bulk:', e);
        results.failed++;
      }
    }

    // Update the bulk request status to APPROVED if all selected items were processed
    if (results.created > 0) {
      await this.prisma.bulkListingRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
        },
      });
    }

    return results;
  }

  // ADMIN: Delete bulk listing request
  async deleteBulkListingRequest(requestId: string) {
    const request = await this.prisma.bulkListingRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Bulk listing request not found');
    }

    await this.prisma.bulkListingRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Bulk listing request deleted successfully' };
  }

  // Update listing (seller/trader only)
  async updateListing(listingId: string, sellerId: string, updateData: { basePrice?: number; stock?: number; gstPercentage?: number }) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new BadRequestException('You can only update your own listings');
    }

    // Calculate new list price if base price or GST changes
    let listPrice = listing.listPrice;
    if (updateData.basePrice !== undefined || updateData.gstPercentage !== undefined) {
      const basePrice = updateData.basePrice ?? Number(listing.basePrice);
      const gstPct = updateData.gstPercentage ?? Number(listing.gstPercentage);
      const adminMarkup = Number(listing.adminMarkupPct ?? 0);

      const gstAmount = basePrice * (gstPct / 100);
      const priceWithGst = basePrice + gstAmount;
      const adminMarkupAmount = priceWithGst * (adminMarkup / 100);
      listPrice = new Decimal(priceWithGst + adminMarkupAmount);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        basePrice: updateData.basePrice,
        stock: updateData.stock,
        gstPercentage: updateData.gstPercentage,
        listPrice,
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

    return { message: 'Listing updated successfully', listing: this.serializeListing(updated) };
  }

  // Delete listing (soft delete - mark as inactive)
  async deleteListing(listingId: string, sellerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new BadRequestException('You can only delete your own listings');
    }

    // Soft delete - set stock to 0 and status to INACTIVE
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'INACTIVE',
        stock: 0,
      },
    });

    return { message: 'Listing deleted successfully' };
  }

  // ADMIN: Update markup for a listing
  async updateListingMarkup(listingId: string, markupValue: number, markupType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE') {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        medicine: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Recalculate list price with new markup
    const basePrice = Number(listing.basePrice);
    const gstPct = Number(listing.gstPercentage);
    const gstAmount = basePrice * (gstPct / 100);
    const priceWithGst = basePrice + gstAmount;

    let listPrice: number;
    if (markupType === 'FIXED') {
      listPrice = priceWithGst + markupValue;
    } else {
      const markupAmount = priceWithGst * (markupValue / 100);
      listPrice = priceWithGst + markupAmount;
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        adminMarkupPct: new Decimal(markupValue),
        adminMarkupType: markupType,
        listPrice: new Decimal(listPrice),
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

    return { message: 'Markup updated successfully', listing: this.serializeListing(updated) };
  }
}
