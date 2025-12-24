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
        status: 'AWAITING_PAYMENT',
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

    // Send purchase order (PO) email to buyer
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
          '📋 Buy Proposal - Purchase Order',
          this.getPurchaseOrderTemplate(
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
        console.error('Failed to send PO email:', error);
        // Continue execution - don't fail the request just because email failed
      }
    }

    return {
      message: 'Purchase Order sent successfully',
      proposal,
    };
  }

  private getPurchaseOrderTemplate(
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
        <!-- Header with 24Rx Logo -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
            24<span style="color: #60a5fa;">Rx</span>
          </h1>
          <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">World's Only Med-Trade Platform</p>
          <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
            <h2 style="color: white; margin: 0; font-size: 24px;">Purchase Order (PO)</h2>
          </div>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hello ${name},</p>
          <p style="font-size: 16px; color: #374151;">Thank you for your interest. Here is the Purchase Order (PO) for your request.</p>
          
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
            <h3 style="margin: 0 0 15px 0; color: #1E40AF;">Bank Details for Payment</h3>
            <p style="margin: 5px 0;"><strong>Bank Name:</strong> HDFC Bank</p>
            <p style="margin: 5px 0;"><strong>Account Name:</strong> 24Rx Trading Pvt Ltd</p>
            <p style="margin: 5px 0;"><strong>Account Number:</strong> 50200012345678</p>
            <p style="margin: 5px 0;"><strong>IFSC Code:</strong> HDFC0001234</p>
          </div>
          
          <p style="font-size: 14px; color: #6B7280; text-align: center;">
            <strong>Next Step:</strong> Please complete the payment and upload the receipt in your dashboard to proceed with approval.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          © 2024 24Rx Exchange. All rights reserved.
        </div>
      </div>
    `;
  }

  private getTaxInvoiceTemplate(
    name: string,
    medicineName: string,
    qty: number,
    unitPrice: number,
    gstPercentage: number,
    gstAmount: number,
    totalCost: number,
    orderId: string
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header with 24Rx Logo -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
            24<span style="color: #a7f3d0;">Rx</span>
          </h1>
          <p style="margin: 10px 0 0 0; color: #ecfdf5; font-size: 14px;">World's Only Med-Trade Platform</p>
          <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
            <h2 style="color: white; margin: 0; font-size: 24px;">Tax Invoice</h2>
          </div>
        </div>

        <div style="padding: 30px; position: relative;">
          <!-- PAID Watermark -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); 
                      border: 5px solid rgba(16, 185, 129, 0.2); color: rgba(16, 185, 129, 0.2); 
                      font-size: 80px; font-weight: bold; padding: 10px 40px; pointer-events: none; user-select: none;">
            PAID
          </div>

          <p style="font-size: 16px; color: #374151;">Hello ${name},</p>
          <p style="font-size: 16px; color: #374151;">We have received your payment. Your order has been approved.</p>
          
          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0; position: relative; z-index: 1;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Invoice Details</h3>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId.substring(0, 8)}</p>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${medicineName}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${qty} units</p>
            <p style="margin: 5px 0;"><strong>Unit Price:</strong> ₹${unitPrice.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>GST (${gstPercentage}%):</strong> ₹${gstAmount.toLocaleString()}</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #D1D5DB;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">Total Paid: ₹${totalCost.toLocaleString()}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
             <p style="color: #059669; font-weight: bold; font-size: 16px;">✅ Payment Successfully Verified</p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          © 2024 24Rx Exchange. All rights reserved.
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
        listing: {
          include: {
            medicine: true,
          },
        },
        buyer: {
          select: {
            email: true,
            name: true,
          },
        },
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
          status: 'PAID',
          paidAt: new Date(),
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

      // Send Tax Invoice Email
      if (proposal.buyer && proposal.buyer.email) {
        try {
          await this.emailService.sendEmail(
            proposal.buyer.email,
            '✅ Payment Received - Tax Invoice',
            this.getTaxInvoiceTemplate(
              proposal.buyer.name,
              proposal.listing.medicine.name,
              proposal.qty,
              totals.unitPrice.toNumber(),
              totals.gstPercentage,
              totals.gstAmount.toNumber(),
              totals.total.toNumber(),
              order.id
            )
          );
        } catch (error) {
          console.error('Failed to send tax invoice email:', error);
        }
      }

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

    if (proposal.status !== 'PENDING' && proposal.status !== 'AWAITING_PAYMENT') {
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
      data: { 
        receiptUrl,
        status: 'PENDING' // Update status to PENDING for admin approval
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
      message: 'Receipt uploaded successfully',
      proposal: updatedProposal,
    };
  }
}
