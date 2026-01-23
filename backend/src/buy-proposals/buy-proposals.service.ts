import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EmailService } from '../common/services/email.service';
import { PdfService } from '../common/services/pdf.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../common/services/sms.service';
import { getPurchaseOrderEmailTemplate, getTaxInvoiceEmailTemplate } from '../common/email-templates';

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

    // Notify Seller to upload invoice
    await this.notificationsService.createNotification({
      userId: listing.sellerId,
      channel: 'INAPP',
      subject: '📦 New Buy Request - Action Required',
      body: `A buyer has requested ${qty} units of ${listing.medicine.name}. Please upload your invoice to proceed.`,
      meta: { buyProposalId: proposal.id, type: 'UPLOAD_INVOICE' },
    });

    // Send purchase order (PO) email to buyer
    const totals = this.calculateTotalsWithGst(listing, qty);
    const totalCost = totals.total.toNumber();
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: {
        email: true,
        name: true,
        phone: true,
        dlNumber: true,
        gstin: true,
        address: true,
      },
    });

    if (buyer && buyer.email) {
      // Generate and send email asynchronously (non-blocking)
      (async () => {
        try {
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
            partyAddress: (buyer.address || 'As per records').replace(/[\r\n]+/g, ', '),
            partyPhone: buyer.phone || '',
            partyGSTIN: buyer.gstin || '',
            partyDLNo: buyer.dlNumber || '',
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
        }
      })();
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

      // Create Notification for Seller
      if (proposal.listing.seller && proposal.listing.seller.id) {
        try {
          await this.notificationsService.createNotification({
            userId: proposal.listing.seller.id,
            subject: '💰 Sale Confirmed',
            body: `Your ${proposal.listing.medicine.name} (${proposal.qty} units) has been sold for ₹${totals.total.toNumber().toFixed(2)}. The buyer will request delivery soon.`,
            meta: {
              type: 'SALE_CONFIRMED',
              orderId: order.id,
              medicineId: proposal.listing.medicineId,
              medicineName: proposal.listing.medicine.name,
              quantity: proposal.qty,
              amount: totals.total.toNumber(),
            },
          });
        } catch (error) {
          console.error('Failed to create notification for seller:', error);
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
        listing: true,
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

    // Update proposal
    const updated = await this.prisma.buyProposal.update({
      where: { id: proposalId },
      data: { sellerInvoiceUrl },
    });

    return { message: 'Invoice uploaded successfully', proposal: updated };
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

    // Notify all admins about new pending buy proposal
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
      message: 'Receipt uploaded successfully',
      proposal: updatedProposal,
    };
  }
}
