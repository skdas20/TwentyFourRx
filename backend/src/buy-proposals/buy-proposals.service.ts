import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EmailService } from '../common/services/email.service';
import { PdfService } from '../common/services/pdf.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../common/services/sms.service';
import { getPurchaseOrderEmailTemplate, getTaxInvoiceEmailTemplate } from '../common/email-templates';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BuyProposalsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
    private emailService: EmailService,
    private pdfService: PdfService,
    private notificationsService: NotificationsService,
    private smsService: SmsService,
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

  async getProposalById(id: string, userId: string) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id },
      include: {
        listing: { include: { medicine: true } },
        buyer: { select: { name: true, email: true } },
      },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.roleCode !== 'ADMIN' && proposal.buyerId !== userId && proposal.listing.sellerId !== userId) {
      throw new BadRequestException('Access denied');
    }

    return proposal;
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
      include: {
        medicine: true,
        seller: { select: { id: true, email: true, name: true } }
      },
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

    // Create buy proposal with seller confirmation flow
    const sellerTimeoutAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

    const proposal = await this.prisma.buyProposal.create({
      data: {
        buyerId,
        listingId,
        qty,
        orderType: 'delivery',
        notes,
        status: 'AWAITING_SELLER', // Changed from AWAITING_PAYMENT
        flowType: 'SELLER_CONFIRMATION',
        sellerTimeoutAt,
      },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Notify seller about new proposal (seller confirmation required)
    if (listing.seller) {
      await this.notificationsService.notifySellerNewProposal(listing.seller, proposal);
    }

    // Notify buyer that proposal is awaiting seller confirmation
    if (proposal.buyer && proposal.buyer.phone) {
      try {
        await this.smsService.sendBuyProposalCreatedSms(
          proposal.buyer.phone,
          listing.medicine.name,
          proposal.id.substring(0, 8),
        );
      } catch (error) {
        console.error('Failed to send SMS:', error);
      }
    }

    return {
      message: 'Buy proposal created. Awaiting seller confirmation. You will receive the invoice once the seller confirms stock availability.',
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
            phone: true,
          },
        },
      },
    });

    // Send SMS to buyer (proposal created)
    if (proposal.buyer && proposal.buyer.phone) {
      try {
        await this.smsService.sendBuyProposalCreatedSms(
          proposal.buyer.phone,
          proposal.listing.medicine.name,
          proposal.id.substring(0, 8),
        );
      } catch (error) {
        console.error('Failed to send SMS:', error);
      }
    }

    // Notify seller about the buy proposal
    const seller = await this.prisma.user.findUnique({
      where: { id: proposal.listing.sellerId },
      select: { id: true, email: true, name: true, phone: true },
    });

    if (seller) {
      // In-app notification for seller
      try {
        await this.notificationsService.createNotification({
          userId: seller.id,
          subject: '🛒 New Buy Proposal Received',
          body: `${proposal.buyer.name} wants to buy ${qty} units of ${proposal.listing.medicine.name}. Awaiting admin approval.`,
          meta: {
            type: 'BUY_PROPOSAL_RECEIVED',
            proposalId: proposal.id,
            buyerName: proposal.buyer.name,
            medicineName: proposal.listing.medicine.name,
            quantity: qty,
          },
        });
      } catch (error) {
        console.error('Failed to notify seller:', error);
      }

      // Email notification for seller
      if (seller.email) {
        const sellerEmailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Buy Proposal for Your Medicine</h2>
            <p>Dear ${seller.name},</p>
            <p>A buyer has submitted a purchase proposal for your listed medicine:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${proposal.listing.medicine.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Buyer:</td><td style="padding: 8px 0;">${proposal.buyer.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${qty} units</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0;">Awaiting Admin Approval</td></tr>
              </table>
            </div>
            <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-weight: 600;">Invoice Details (for your reference):</p>
              <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">
                <strong>D.L. No:</strong> JH-RNS-15350015301<br>
                <strong>GSTIN:</strong> 20GAKPK4400G1Z7<br>
                <strong>E-Mail:</strong> 24rxmedicalsupply@gmail.com
              </p>
            </div>
            <p>You will be notified once the admin reviews this proposal.</p>
          </div>
        `;
        this.emailService.sendEmail(
          seller.email,
          `New Buy Proposal - ${proposal.listing.medicine.name}`,
          sellerEmailBody,
        ).catch(err => console.error('Failed to send email to seller:', err));
      }
    }

    return {
      message: 'Buy proposal submitted successfully. Waiting for admin approval.',
      proposal,
    };
  }

  async getPendingProposals() {
    return this.prisma.buyProposal.findMany({
      where: {
        status: {
          in: [
            'PENDING',
            'AWAITING_SELLER',
            'SELLER_CONFIRMED',
            'QUANTITY_MODIFIED',
            'AWAITING_PAYMENT',
            'AWAITING_SELLER_INVOICE'
          ], // Include all active statuses (not APPROVED/REJECTED)
        },
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
            seller: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Support both legacy PENDING and new SELLER_CONFIRMED status
    if (proposal.status !== 'PENDING' && proposal.status !== 'SELLER_CONFIRMED') {
      throw new BadRequestException('Proposal already processed or not ready for approval');
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
      // Upload invoice to GCS first if provided (so we can save URL in order)
      let invoiceUrl: string | undefined;
      if (invoice) {
        try {
          invoiceUrl = await this.gcsService.uploadFile(invoice, 'invoices');
        } catch (uploadError) {
          console.error('Failed to upload invoice to GCS:', uploadError);
          // Continue without invoice if upload fails
        }
      }

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
          invoiceUrl: invoiceUrl,
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

      // Send Tax Invoice Email to Buyer
      if (proposal.buyer && proposal.buyer.email) {
        try {
          let invoiceAttachment: any = null;

          // If admin uploaded an invoice, attach it to email
          if (invoiceUrl && invoice) {
            const fileExtension = invoice.originalname.split('.').pop();
            invoiceAttachment = {
              filename: `Invoice_${order.id.substring(0, 8)}.${fileExtension}`,
              path: invoiceUrl, // Nodemailer will fetch from URL
              contentType: invoice.mimetype,
            };
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
          console.error('Failed to send tax invoice email to buyer:', error);
        }
      }

      // Send Tax Invoice Email to Seller
      if (proposal.listing.seller && proposal.listing.seller.email) {
        try {
          let invoiceAttachment: any = null;

          // If admin uploaded an invoice, attach it to email
          if (invoiceUrl && invoice) {
            const fileExtension = invoice.originalname.split('.').pop();
            invoiceAttachment = {
              filename: `Invoice_${order.id.substring(0, 8)}.${fileExtension}`,
              path: invoiceUrl, // Nodemailer will fetch from URL
              contentType: invoice.mimetype,
            };
          }

          // Create email template for seller
          const sellerEmailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Sale Confirmed - Tax Invoice</h2>

              <p>Dear ${proposal.listing.seller.name},</p>

              <p>Great news! Your medicine has been sold and payment has been received.</p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Sale Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Medicine:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${proposal.listing.medicine.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Quantity:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${proposal.qty} units</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Unit Price:</td>
                    <td style="padding: 8px 0; font-weight: bold;">₹${totals.unitPrice.toNumber().toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">GST (${totals.gstPercentage}%):</td>
                    <td style="padding: 8px 0; font-weight: bold;">₹${totals.gstAmount.toNumber().toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #d1d5db;">
                    <td style="padding: 8px 0; color: #1f2937; font-size: 16px;">Total Amount:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #10b981; font-size: 18px;">₹${totals.total.toNumber().toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Order ID:</td>
                    <td style="padding: 8px 0; font-family: monospace;">${order.id.substring(0, 8)}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong></p>
                <p style="margin: 5px 0 0 0; color: #1e40af;">The buyer will request delivery soon. You'll receive a notification to dispatch the order.</p>
              </div>

              <p>The tax invoice is attached to this email for your records.</p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                24Rx Team
              </p>
            </div>
          `;

          await this.emailService.sendEmail(
            proposal.listing.seller.email,
            '💰 Sale Confirmed - Tax Invoice',
            sellerEmailBody,
            invoiceAttachment ? [invoiceAttachment] : undefined
          );
        } catch (error) {
          console.error('Failed to send tax invoice email to seller:', error);
        }
      }

      // Send notification to buyer (PI generated, upload payment confirmation)
      if (proposal.buyer) {
        try {
          await this.notificationsService.notifyBuyerPIGenerated(
            proposal.buyer,
            proposal,
            order.id,
          );
        } catch (error) {
          console.error('Failed to send notification to buyer:', error);
        }
      }

      // Send SMS to Buyer (proposal approved)
      if (proposal.buyer && proposal.buyer.phone) {
        try {
          const proposalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-proposals`;
          await this.smsService.sendBuyProposalApprovedSms(
            proposal.buyer.phone,
            proposal.listing.medicine.name,
            proposalLink,
          );
        } catch (error) {
          console.error('Failed to send SMS to buyer:', error);
        }
      }

      // Send SMS to Seller (buy request received - need to upload invoice)
      const seller = await this.prisma.user.findUnique({
        where: { id: proposal.listing.sellerId },
        select: { phone: true },
      });

      if (seller && seller.phone) {
        try {
          const uploadLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller`;
          await this.smsService.sendBuyRequestReceivedSms(
            seller.phone,
            proposal.listing.medicine.name,
            uploadLink,
          );
        } catch (error) {
          console.error('Failed to send SMS to seller:', error);
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

  async uploadSellerInvoice(
    proposalId: string,
    sellerId: string,
    invoice: Express.Multer.File,
  ) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { id: true, email: true, name: true, phone: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.listing.sellerId !== sellerId) {
      throw new BadRequestException('You are not the seller of this item');
    }

    // Upload invoice
    let sellerInvoiceUrl: string;
    try {
      sellerInvoiceUrl = await this.gcsService.uploadFile(invoice, 'seller-invoices');
    } catch (error) {
      console.error('Failed to upload seller invoice:', error);
      throw new BadRequestException('Failed to upload invoice');
    }

    console.log('✅ Seller uploaded invoice, creating order...');

    // Calculate totals
    const totals = this.calculateTotalsWithGst(proposal.listing, proposal.qty);

    // Create order
    const order = await this.prisma.order.create({
      data: {
        buyerId: proposal.buyerId,
        listingId: proposal.listingId,
        qty: proposal.qty,
        unitPrice: totals.unitPrice,
        amount: totals.total,
        type: 'BUY',
        status: 'PAID',
        paidAt: new Date(),
        invoiceUrl: sellerInvoiceUrl,
      },
    });

    // Create inventory lot
    await this.prisma.inventoryLot.create({
      data: {
        userId: proposal.buyerId,
        medicineId: proposal.listing.medicineId,
        qty: proposal.qty,
        unitCost: totals.unitPrice,
        sourceOrderId: order.id,
      },
    });

    // Update proposal to APPROVED
    await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
        status: 'APPROVED',
        sellerInvoiceUrl,
        approvedOrderId: order.id,
        reviewedAt: new Date(),
      },
    });

    // Send Tax Invoice to buyer
    if (proposal.buyer?.email) {
      try {
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
        );
        console.log('✅ Tax Invoice sent to buyer');
      } catch (error) {
        console.error('Failed to send tax invoice:', error);
      }
    }

    return {
      message: 'Invoice uploaded! Order created and tax invoice sent to buyer.',
      orderId: order.id,
    };
  }

  // Helper method to send PI to buyer
  private async sendPItoBuyer(proposal: any) {
    // Calculate totals
    const totals = this.calculateTotalsWithGst(proposal.listing, proposal.qty);

    // Update proposal status to AWAITING_PAYMENT
    await this.prisma.buyProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'AWAITING_PAYMENT',
      },
    });

    // Generate PI PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await this.pdfService.generateQuotationPDF({
        invoiceNo: `PI-${proposal.id.substring(0, 8).toUpperCase()}`,
        invoiceDate: new Date().toLocaleDateString('en-GB'),
        orderNo: proposal.id.substring(0, 8).toUpperCase(),
        orderDate: new Date(proposal.createdAt).toLocaleDateString('en-GB'),
        lrDate: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        partyName: proposal.buyer.name,
        partyAddress: '', // Add if available
        partyPhone: proposal.buyer.phone || '',
        partyGSTIN: '', // Add if available
        partyDLNo: '', // Add if available
        items: [{
          hsn: '', // HSN code not in schema
          productName: proposal.listing.medicine.name,
          pack: proposal.listing.medicine.packSize || '1',
          qty: proposal.qty,
          batch: proposal.confirmedBatchNo || 'TBD',
          mfg: new Date().toLocaleDateString('en-GB'), // Use current date
          exp: new Date(proposal.confirmedExpiryDate || Date.now()).toLocaleDateString('en-GB'),
          mrp: proposal.listing.medicine.mrp?.toNumber() || 0,
          rate: totals.unitPrice.toNumber(),
          dis: 0,
          sgst: totals.gstPercentage / 2,
          sgstValue: (totals.gstAmount.toNumber() / 2),
          cgst: totals.gstPercentage / 2,
          cgstValue: (totals.gstAmount.toNumber() / 2),
          amount: totals.total.toNumber(),
        }],
        totalSGST: totals.gstAmount.toNumber() / 2,
        totalCGST: totals.gstAmount.toNumber() / 2,
        grandTotal: totals.total.toNumber(),
        totalItems: 1,
        totalQty: proposal.qty,
      });
      console.log('✅ PI PDF generated');
    } catch (error) {
      console.error('Failed to generate PI PDF:', error);
    }

    // Send Proforma Invoice (PI) to buyer
    if (proposal.buyer?.email) {
      try {
        const attachment = pdfBuffer ? {
          filename: `Proforma_Invoice_${proposal.id.substring(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        } : undefined;

        await this.emailService.sendEmail(
          proposal.buyer.email,
          '📄 Proforma Invoice - Payment Required',
          getPurchaseOrderEmailTemplate(
            proposal.buyer.name,
            proposal.listing.medicine.name,
            proposal.qty,
            totals.unitPrice.toNumber(),
            totals.gstPercentage,
            totals.gstAmount.toNumber(),
            totals.total.toNumber(),
          ),
          attachment ? [attachment] : undefined,
        );
        console.log('✅ Proforma Invoice (PI) email with PDF sent to buyer');
      } catch (error) {
        console.error('Failed to send PI to buyer:', error);
      }
    }

    // Send in-app notification to buyer
    if (proposal.buyer) {
      try {
        await this.notificationsService.notifyBuyerPIGenerated(
          proposal.buyer,
          proposal,
          proposal.id,
        );
      } catch (error) {
        console.error('Failed to notify buyer:', error);
      }
    }
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
      throw new BadRequestException(`Proposal already processed. Current status: ${proposal.status}`);
    }

    // Upload receipt to GCS
    let receiptUrl: string;
    try {
      receiptUrl = await this.gcsService.uploadFile(receipt, 'buy-receipts');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      throw new BadRequestException('Failed to upload receipt');
    }

    // Check if this is seller confirmation flow
    if (proposal.flowType === 'SELLER_CONFIRMATION') {
      console.log('✅ Receipt uploaded - Notifying seller to upload invoice');

      // Update proposal status to awaiting seller invoice
      const updatedProposal = await this.prisma.buyProposal.update({
        where: { id: proposalId },
        data: {
          status: 'AWAITING_SELLER_INVOICE',
          receiptUrl,
        },
        include: {
          listing: {
            include: {
              medicine: true,
              seller: { select: { id: true, email: true, name: true } }
            }
          },
          buyer: { select: { id: true, email: true, name: true } },
        },
      });

      // Notify seller to upload invoice
      if (updatedProposal.listing.seller) {
        console.log('📧 Sending upload invoice notification to seller (after buyer payment)');
        await this.notificationsService.notifySellerUploadInvoice(
          updatedProposal.listing.seller,
          updatedProposal,
        );
      }

      return {
        message: 'Payment receipt uploaded! Waiting for seller to upload invoice.',
      };
    }

    // Legacy flow: Update proposal and notify admin
    const updatedProposal = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
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

    // Notify admins
    const admins = await this.prisma.user.findMany({
      where: { roleCode: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notificationsService.createNotification({
        userId: admin.id,
        channel: 'INAPP',
        subject: '📝 New Buy Proposal Pending Review',
        body: `${updatedProposal.buyer.name} has uploaded a receipt for ${updatedProposal.qty} units of ${updatedProposal.listing.medicine.name}. Please review.`,
        meta: { buyProposalId: updatedProposal.id },
      });
    }

    return {
      message: 'Receipt uploaded successfully. Awaiting admin approval.',
      proposal: updatedProposal,
    };
  }

  // NEW: Create proposal with seller confirmation flow
  async createProposalWithSellerFlow(
    buyerId: string,
    listingId: string,
    qty: number,
    orderType: string,
    receipt?: Express.Multer.File,
  ) {
    // Validate listing exists and has stock
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        medicine: true,
        seller: { select: { id: true, email: true, name: true } }
      },
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

    // Create buy proposal with seller flow
    const sellerTimeoutAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

    const proposal = await this.prisma.buyProposal.create({
      data: {
        buyerId,
        listingId,
        qty,
        orderType,
        receiptUrl,
        status: 'AWAITING_SELLER',
        flowType: 'SELLER_CONFIRMATION',
        sellerTimeoutAt,
      },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Notify seller about new proposal
    if (listing.seller) {
      await this.notificationsService.notifySellerNewProposal(listing.seller, proposal);
    }

    // Notify buyer that proposal is created
    if (proposal.buyer && proposal.buyer.phone) {
      try {
        await this.smsService.sendBuyProposalCreatedSms(
          proposal.buyer.phone,
          proposal.listing.medicine.name,
          proposal.id.substring(0, 8),
        );
      } catch (error) {
        console.error('Failed to send SMS:', error);
      }
    }

    return {
      message: 'Buy proposal created. Awaiting seller confirmation.',
      proposal,
    };
  }

  // NEW: Seller confirms the proposal
  async confirmProposalBySeller(
    proposalId: string,
    sellerId: string,
    confirmedQty: number,
    batchNo: string,
    expiryDate: Date,
    note?: string,
  ) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { id: true, email: true, name: true, phone: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.listing.sellerId !== sellerId) {
      throw new BadRequestException('You are not the seller of this listing');
    }

    if (proposal.status !== 'AWAITING_SELLER') {
      throw new BadRequestException('Proposal is not awaiting seller confirmation');
    }

    // Check if quantity was modified
    const qtyModified = confirmedQty < proposal.qty;
    const newStatus = qtyModified ? 'QUANTITY_MODIFIED' : 'SELLER_CONFIRMED';

    const updatedProposal = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
        status: newStatus,
        sellerConfirmedAt: new Date(),
        sellerNote: note,
        confirmedQty,
        confirmedBatchNo: batchNo,
        confirmedExpiryDate: expiryDate,
      },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
    });

    // Notify based on quantity modification
    if (qtyModified) {
      // Notify buyer about modified quantity
      await this.notificationsService.notifyBuyerQtyModified(proposal.buyer, updatedProposal);
    } else {
      // Generate and send PI to buyer immediately
      console.log('✅ Seller confirmed, sending PI to buyer immediately...');
      await this.sendPItoBuyer(updatedProposal);

      // Notify admin for review
      await this.notificationsService.notifyAdminSellerConfirmed(updatedProposal);
    }

    // Mark the seller's confirmation notification as read
    try {
      console.log('📖 Marking seller notification as read for proposal:', proposalId);
      const notifications = await this.prisma.notification.findMany({
        where: {
          userId: sellerId,
          isRead: false,
        },
      });

      console.log(`Found ${notifications.length} unread notifications for seller`);

      // Filter by meta fields and mark as read
      let markedCount = 0;
      for (const notif of notifications) {
        const meta = notif.meta as any;
        if (
          meta?.proposalId === proposalId &&
          (meta?.type === 'PROPOSAL_SELLER_CONFIRMATION_REQUIRED' ||
           meta?.type === 'PROPOSAL_REMINDER')
        ) {
          await this.prisma.notification.update({
            where: { id: notif.id },
            data: { isRead: true },
          });
          markedCount++;
          console.log(`✅ Marked notification ${notif.id} as read`);
        }
      }

      if (markedCount === 0) {
        console.log('⚠️ No matching notifications found to mark as read');
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }

    return {
      message: qtyModified
        ? 'Quantity modified. Awaiting buyer approval.'
        : 'Proposal confirmed. Awaiting admin approval.',
      proposal: updatedProposal,
    };
  }

  // NEW: Buyer approves modified quantity
  async buyerApproveModifiedQty(proposalId: string, buyerId: string) {
    console.log('🔍 Buyer approve request:', { proposalId, buyerId });

    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.buyerId !== buyerId) {
      throw new BadRequestException('You are not the buyer of this proposal');
    }

    // Allow idempotent approval - if already approved (AWAITING_PAYMENT or SELLER_CONFIRMED), return success
    if (proposal.status === 'AWAITING_PAYMENT' || proposal.status === 'SELLER_CONFIRMED') {
      console.log('⚠️ Proposal already approved (idempotent request), returning success');
      return {
        message: 'Quantity already approved. PI has been sent.',
        proposal,
      };
    }

    if (proposal.status !== 'QUANTITY_MODIFIED') {
      console.error(`❌ Buyer approve failed: Expected QUANTITY_MODIFIED but got ${proposal.status}`);
      throw new BadRequestException(`Proposal is not awaiting buyer approval. Current status: ${proposal.status}`);
    }

    console.log('✅ Buyer approving modified quantity for proposal:', proposalId);

    const updatedProposal = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
        status: 'SELLER_CONFIRMED',
        qty: proposal.confirmedQty || proposal.qty, // Update qty to confirmed qty
      },
      include: {
        listing: { include: { medicine: true, seller: { select: { id: true, email: true, name: true } } } },
        buyer: { select: { id: true, email: true, name: true, phone: true } },
      },
    });

    // Generate and send PI to buyer immediately after qty approval
    console.log('✅ Buyer approved qty, sending PI to buyer immediately...');
    await this.sendPItoBuyer(updatedProposal);

    // Notify admin for review
    await this.notificationsService.notifyAdminSellerConfirmed(updatedProposal);

    return {
      message: 'Modified quantity approved. Awaiting admin approval.',
      proposal: updatedProposal,
    };
  }

  // NEW: Buyer rejects modified quantity
  async buyerRejectModifiedQty(proposalId: string, buyerId: string, reason?: string) {
    const proposal = await this.prisma.buyProposal.findUnique({
      where: { id: proposalId },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.buyerId !== buyerId) {
      throw new BadRequestException('You are not the buyer of this proposal');
    }

    if (proposal.status !== 'QUANTITY_MODIFIED') {
      throw new BadRequestException('Proposal is not awaiting buyer approval');
    }

    const updatedProposal = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        reviewerNote: reason || 'Buyer rejected modified quantity',
        reviewedAt: new Date(),
      },
    });

    // Notify both seller and buyer
    await this.notificationsService.notifyBuyerProposalRejected(proposal.buyer, updatedProposal, 'buyer_rejected');

    if (proposal.listing.seller) {
      await this.notificationsService.createNotification({
        userId: proposal.listing.seller.id,
        subject: '❌ Buy Proposal Rejected by Buyer',
        body: `The buyer rejected the modified quantity for ${proposal.listing.medicine.name}. Reason: ${reason || 'Not specified'}`,
        meta: {
          type: 'PROPOSAL_REJECTED_BY_BUYER',
          proposalId: proposal.id,
          reason,
        },
      });
    }

    return {
      message: 'Proposal rejected successfully.',
      proposal: updatedProposal,
    };
  }

  // NEW: Get seller's pending proposals
  async getSellerPendingProposals(sellerId: string) {
    return this.prisma.buyProposal.findMany({
      where: {
        status: 'AWAITING_SELLER',
        listing: {
          sellerId,
        },
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
      orderBy: { createdAt: 'asc' },
    });
  }

  // NEW: Cron job to check proposal timeouts
  @Cron(CronExpression.EVERY_HOUR)
  async checkProposalTimeouts() {
    const now = new Date();

    // 24-hour reminders
    const reminderTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const needsReminder = await this.prisma.buyProposal.findMany({
      where: {
        status: 'AWAITING_SELLER',
        sellerReminderSentAt: null,
        createdAt: { lte: reminderTime },
      },
      include: {
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        },
        buyer: { select: { name: true } }
      },
    });

    for (const proposal of needsReminder) {
      if (proposal.listing.seller) {
        await this.notificationsService.notifySellerReminder(
          proposal.listing.seller,
          proposal
        );

        await this.prisma.buyProposal.update({
          where: { id: proposal.id },
          data: { sellerReminderSentAt: now },
        });
      }
    }

    // 48-hour auto-reject
    const expired = await this.prisma.buyProposal.findMany({
      where: {
        status: 'AWAITING_SELLER',
        createdAt: { lte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      },
      include: {
        buyer: { select: { id: true, email: true, name: true } },
        listing: {
          include: {
            medicine: true,
            seller: { select: { id: true, email: true, name: true } }
          }
        }
      },
    });

    for (const proposal of expired) {
      await this.prisma.buyProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'REJECTED',
          reviewerNote: 'Auto-rejected: Seller did not respond within 48 hours',
          reviewedAt: now,
        },
      });

      // Notify both parties
      await this.notificationsService.notifyBuyerProposalRejected(
        proposal.buyer,
        proposal,
        'timeout'
      );

      if (proposal.listing.seller) {
        await this.notificationsService.createNotification({
          userId: proposal.listing.seller.id,
          subject: '⏰ Buy Proposal Auto-Rejected',
          body: `Your proposal for ${proposal.listing.medicine.name} was auto-rejected due to timeout (48 hours).`,
          meta: {
            type: 'PROPOSAL_AUTO_REJECTED',
            proposalId: proposal.id,
          },
        });
      }
    }

    console.log(`Processed ${needsReminder.length} reminders and ${expired.length} auto-rejections`);
  }
}
