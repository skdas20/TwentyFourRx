import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class BuyProposalsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
    private emailService: EmailService,
  ) { }

  private calculateTotalsWithGst(listing: any, qty: number) {
    const unitPrice = new Decimal(listing.listPrice || listing.basePrice || 0);
    const gstPct = new Decimal(listing.gstPercentage || 0);
    const subtotal = unitPrice.mul(qty);
    const gstAmount = subtotal.mul(gstPct).div(100);
    const total = subtotal.add(gstAmount);

    return {
      unitPrice,
      gstPercentage: gstPct.toNumber(),
      subtotal,
      gstAmount,
      total,
    };
  }

  async sendInvoice(
    buyerId: string,
    listingId: string,
    qty: number,
    notes?: string,
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

    // Create buy proposal with delivery type (default for invoice)
    const proposal = await this.prisma.buyProposal.create({
      data: {
        buyerId,
        listingId,
        qty,
        orderType: 'delivery',
        notes,
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

    // Send invoice email to buyer
    const totals = this.calculateTotalsWithGst(listing, qty);
    const totalCost = totals.total.toNumber();
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true, name: true },
    });

    if (buyer && buyer.email) {
      try {
        await this.emailService.sendEmail(
          buyer.email,
          '🧾 Payment Invoice - 24Rx',
          this.getInvoiceEmailTemplate(
            buyer.name,
            listing.medicine.name,
            qty,
            totals.unitPrice.toNumber(),
            totals.gstPercentage,
            totals.gstAmount.toNumber(),
            totalCost,
          )
        );
      } catch (error) {
        console.error('Failed to send invoice email:', error);
        // Continue execution - don't fail the request just because email failed
      }
    }

    return {
      message: 'Invoice sent successfully',
      proposal,
    };
  }

  private getInvoiceEmailTemplate(
    name: string,
    medicineName: string,
    qty: number,
    unitPrice: number,
    gstPercentage: number,
    gstAmount: number,
    totalCost: number,
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🧾 Payment Invoice</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hello ${name},</p>
          <p style="font-size: 16px; color: #374151;">Here are the payment details for your purchase request:</p>
          
          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Order Summary</h3>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${medicineName}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${qty} units</p>
            <p style="margin: 5px 0;"><strong>Unit Price:</strong> ₹${unitPrice.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>GST (${gstPercentage}%):</strong> ₹${gstAmount.toLocaleString()}</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #D1D5DB;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1E40AF;">Total Amount (incl. GST): ₹${totalCost.toLocaleString()}</p>
            </div>
          </div>
          
          <div style="background: #DBEAFE; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1E40AF;">Bank Details</h3>
            <p style="margin: 5px 0;"><strong>Bank Name:</strong> HDFC Bank</p>
            <p style="margin: 5px 0;"><strong>Account Name:</strong> 24Rx Trading Pvt Ltd</p>
            <p style="margin: 5px 0;"><strong>Account Number:</strong> 50200012345678</p>
            <p style="margin: 5px 0;"><strong>IFSC Code:</strong> HDFC0001234</p>
          </div>
          
          <p style="font-size: 14px; color: #6B7280;">Please complete the payment and upload the receipt in the dashboard to proceed.</p>
        </div>
      </div>
    `;
  }

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
        receiptUrl = await this.gcsService.uploadFile(receipt, 'buy-receipts');
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
    const totals = this.calculateTotalsWithGst(proposal.listing, proposal.qty);

    if (proposal.orderType === 'mtf') {
      // Create hold for MTF
      const hold = await this.prisma.hold.create({
        data: {
          traderId: proposal.buyerId,
          listingId: proposal.listingId,
          qty: proposal.qty,
          paidAmount: totals.total,
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
          unitPrice: totals.unitPrice,
          amount: totals.total,
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
          unitCost: totals.unitPrice,
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

  async uploadReceipt(
    proposalId: string,
    buyerId: string,
    receipt: Express.Multer.File,
  ) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
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

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.buyerId !== buyerId) {
      throw new BadRequestException('You can only upload receipt for your own proposals');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Proposal already processed');
    }

    // Upload receipt to GCS
    let receiptUrl: string;
    try {
      receiptUrl = await this.gcsService.uploadFile(receipt, 'buy-receipts');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      throw new BadRequestException('Failed to upload receipt');
    }

    // Update proposal with receipt URL
    const updatedProposal = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: { receiptUrl },
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
      message: 'Receipt uploaded successfully',
      proposal: updatedProposal,
    };
  }
}
