import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EmailService } from '../common/services/email.service';
import { PdfService } from '../common/services/pdf.service';
import { getPurchaseOrderEmailTemplate, getTaxInvoiceEmailTemplate } from '../common/email-templates';

@Injectable()
export class BuyProposalsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
    private emailService: EmailService,
    private pdfService: PdfService,
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
        // Generate PDF Quotation
        const invoiceNo = `QT${Date.now().toString().slice(-6)}`;
        const currentDate = new Date().toLocaleDateString('en-GB');

        const quotationData = {
          invoiceNo: invoiceNo,
          invoiceDate: currentDate,
          orderNo: proposal.id.substring(0, 8),
          orderDate: currentDate,
          lrDate: currentDate,
          dueDate: currentDate,
          partyName: buyer.name || 'Customer',
          partyAddress: 'As per records',
          partyPhone: '',
          partyGSTIN: '',
          partyDLNo: '',
          items: [
            {
              hsn: '',
              productName: listing.medicine.name,
              pack: '1*1',
              qty: qty,
              batch: listing.batchNo || '',
              mfg: '',
              exp: listing.expiryDate ? new Date(listing.expiryDate).toLocaleDateString('en-GB') : '',
              mrp: totals.unitPrice.toNumber(),
              rate: totals.unitPrice.toNumber(),
              dis: 0,
              sgst: totals.gstPercentage / 2,
              sgstValue: totals.gstAmount.toNumber() / 2,
              cgst: totals.gstPercentage / 2,
              cgstValue: totals.gstAmount.toNumber() / 2,
              amount: totals.total.toNumber(),
            },
          ],
          totalSGST: totals.gstAmount.toNumber() / 2,
          totalCGST: totals.gstAmount.toNumber() / 2,
          grandTotal: totals.total.toNumber(),
          totalItems: 1,
          totalQty: qty,
        };

        const pdfBuffer = await this.pdfService.generateQuotationPDF(quotationData);

        await this.emailService.sendEmail(
          buyer.email,
          '📋 Buy Proposal - Purchase Order & Quotation',
          getPurchaseOrderEmailTemplate(
            buyer.name,
            listing.medicine.name,
            qty,
            totals.unitPrice.toNumber(),
            totals.gstPercentage,
            totals.gstAmount.toNumber(),
            totalCost,
          ),
          [
            {
              filename: `Quotation_${invoiceNo}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
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

  async approveProposal(proposalId: string, reviewerNote?: string, invoice?: Express.Multer.File) {
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
          let invoiceAttachment: any = null;

          // If admin uploaded an invoice, upload it to GCS and attach it to email
          if (invoice) {
            try {
              const invoiceUrl = await this.gcsService.uploadFile(invoice, 'invoices');
              const fileExtension = invoice.originalname.split('.').pop();
              invoiceAttachment = {
                filename: `Invoice_${order.id.substring(0, 8)}.${fileExtension}`,
                path: invoiceUrl, // Nodemailer will fetch from URL
                contentType: invoice.mimetype,
              };
            } catch (uploadError) {
              console.error('Failed to upload invoice to GCS:', uploadError);
              // Continue without attachment if upload fails
            }
          }

          await this.emailService.sendEmail(
            proposal.buyer.email,
            '✅ Payment Received - Tax Invoice',
            getTaxInvoiceEmailTemplate(
              proposal.buyer.name,
              proposal.listing.medicine.name,
              proposal.qty,
              totals.unitPrice.toNumber(),
              totals.gstPercentage,
              totals.gstAmount.toNumber(),
              totals.total.toNumber(),
              order.id
            ),
            invoiceAttachment ? [invoiceAttachment] : undefined
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
