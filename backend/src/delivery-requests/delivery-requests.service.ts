import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { generateOtp, generateOtpExpiry, validateOtp } from '../common/utils/otp.util';

@Injectable()
export class DeliveryRequestsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private gcsService: GcsService,
    ) { }

    // Create a delivery request for an inventory lot
    async createRequest(requesterId: string, inventoryLotId: string, qty: number) {
        // Validate inventoryLotId is provided
        if (!inventoryLotId) {
            throw new BadRequestException('Inventory lot ID is required. Please select a valid holding.');
        }

        // Validate inventory lot exists and belongs to user
        const lot = await this.prisma.inventoryLot.findUnique({
            where: { id: inventoryLotId },
            include: {
                user: true,
                medicine: {
                    include: {
                        manufacturer: true,
                    },
                },
            },
        });

        if (!lot) {
            throw new NotFoundException('Inventory lot not found');
        }

        if (lot.userId !== requesterId) {
            throw new BadRequestException('You can only request delivery for your own inventory');
        }

        if (qty > lot.qty) {
            throw new BadRequestException(`Requested quantity exceeds available stock (${lot.qty})`);
        }

        // Check for existing pending request
        const existingRequest = await this.prisma.deliveryRequest.findFirst({
            where: {
                inventoryLotId,
                status: 'PENDING',
            },
        });

        if (existingRequest) {
            throw new BadRequestException('A pending delivery request already exists for this lot');
        }

        // Create the delivery request
        const request = await this.prisma.deliveryRequest.create({
            data: {
                requesterId,
                inventoryLotId,
                qty,
                status: 'PENDING',
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: {
                            include: { manufacturer: true },
                        },
                    },
                },
            },
        });

        // Send email to admin
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@24rx.in';
            await this.emailService.sendEmail(
                adminEmail,
                '🚚 New Delivery Request Pending Approval',
                this.getAdminNotificationTemplate(request),
            );
        } catch (error) {
            console.error('Failed to send admin notification email:', error);
        }

        // Create in-app notification for admin
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: '🚚 New Delivery Request',
                    body: `${request.requester.name} has requested physical delivery of ${qty} units of ${request.inventoryLot.medicine.name}`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        return {
            message: 'Delivery request submitted successfully. Awaiting admin approval.',
            request,
        };
    }

    // Get delivery requests for a user
    async getMyRequests(userId: string) {
        return this.prisma.deliveryRequest.findMany({
            where: { requesterId: userId },
            include: {
                inventoryLot: {
                    include: {
                        medicine: {
                            include: { manufacturer: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get all delivery requests (admin)
    async getAllRequests(status?: string) {
        const where = status ? { status: status as any } : {};

        return this.prisma.deliveryRequest.findMany({
            where,
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: {
                            include: { manufacturer: true },
                        },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true, phone: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Approve a delivery request (admin)
    async approveRequest(requestId: string, reviewerNote?: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: {
                            include: { manufacturer: true },
                        },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true, phone: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException(`Request is already ${request.status}`);
        }

        // Update status to APPROVED
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewerNote,
                reviewedAt: new Date(),
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true, phone: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // Get the original seller from the source order
        const seller = updated.inventoryLot.sourceOrder?.listing?.seller;

        if (seller?.email) {
            // Send email to seller to dispatch
            try {
                await this.emailService.sendEmail(
                    seller.email,
                    '📦 Delivery Dispatch Request - Action Required',
                    this.getSellerDispatchTemplate(updated, seller),
                );
            } catch (error) {
                console.error('Failed to send seller dispatch email:', error);
            }

            // Create in-app notification for seller
            await this.prisma.notification.create({
                data: {
                    userId: seller.id,
                    channel: 'INAPP',
                    subject: '📦 Dispatch Required',
                    body: `Please dispatch ${updated.qty} units of ${updated.inventoryLot.medicine.name} to ${updated.requester.name}`,
                    meta: { deliveryRequestId: updated.id },
                },
            });
        }

        // Notify the requester
        await this.prisma.notification.create({
            data: {
                userId: updated.requesterId,
                channel: 'INAPP',
                subject: '✅ Delivery Request Approved',
                body: `Your delivery request for ${updated.qty} units of ${updated.inventoryLot.medicine.name} has been approved. The seller will dispatch soon.`,
                meta: { deliveryRequestId: updated.id },
            },
        });

        return { message: 'Delivery request approved. Seller has been notified to dispatch.', request: updated };
    }

    // Reject a delivery request (admin)
    async rejectRequest(requestId: string, reviewerNote: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                inventoryLot: {
                    include: { medicine: true },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException(`Request is already ${request.status}`);
        }

        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                reviewerNote,
                reviewedAt: new Date(),
            },
        });

        // Notify the requester
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '❌ Delivery Request Rejected',
                body: `Your delivery request for ${request.qty} units of ${request.inventoryLot.medicine.name} was rejected. Reason: ${reviewerNote}`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return { message: 'Delivery request rejected', request: updated };
    }

    // Mark as dispatched (admin or seller)
    // Mark as dispatched - with invoice upload (SELLER)
    async markDispatched(requestId: string, sellerId: string, invoiceFile?: Express.Multer.File) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { 
                    include: { 
                        medicine: true,
                        user: { select: { id: true } }
                    } 
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        // Verify seller owns this inventory
        if (request.inventoryLot.user.id !== sellerId) {
            throw new BadRequestException('You can only dispatch your own inventory');
        }

        if (request.status !== 'APPROVED') {
            throw new BadRequestException('Request must be approved before dispatching');
        }

        let invoiceUrl: string | undefined;

        // Upload invoice if provided
        if (invoiceFile) {
            invoiceUrl = await this.gcsService.uploadFile(invoiceFile, 'invoices');
        }

        // Update request with invoice URL and notify admin for verification
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                invoiceUrl: invoiceUrl,
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        // Notify admin for invoice verification
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true, email: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: '📄 Invoice Uploaded - Verification Required',
                    body: `Seller has uploaded an invoice for delivery request. Please verify before dispatch.`,
                    meta: { deliveryRequestId: request.id },
                },
            });

            // Send email to admin
            try {
                await this.emailService.sendEmail(
                    admin.email,
                    '📄 Invoice Uploaded - Verification Required',
                    `<p>A seller has uploaded an invoice for a delivery request.</p>
                     <p>Medicine: ${request.inventoryLot.medicine.name}</p>
                     <p>Quantity: ${request.qty}</p>
                     ${invoiceUrl ? `<p>Invoice: <a href="${invoiceUrl}">View Invoice</a></p>` : ''}
                     <p>Please review and approve for dispatch.</p>`,
                );
            } catch (error) {
                console.error('Failed to send admin email:', error);
            }
        }

        return { 
            message: 'Invoice uploaded successfully. Awaiting admin verification for dispatch.', 
            request: updated 
        };
    }

    // Admin verifies invoice and dispatches (ADMIN only)
    async verifyAndDispatch(requestId: string, approved: boolean, note?: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: { 
                    include: { 
                        medicine: true,
                        user: { select: { id: true } }
                    } 
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'APPROVED') {
            throw new BadRequestException('Request must be approved before verification');
        }

        if (!approved) {
            // Rejected - notify seller to re-upload
            await this.prisma.notification.create({
                data: {
                    userId: request.inventoryLot.user.id,
                    channel: 'INAPP',
                    subject: '❌ Invoice Rejected',
                    body: `Your invoice was rejected. Reason: ${note || 'Please re-upload a valid invoice.'}`,
                    meta: { deliveryRequestId: request.id },
                },
            });

            return {
                message: 'Invoice rejected. Seller has been notified.',
                request,
            };
        }

        // Approved - Generate OTP and mark as dispatched
        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry(24); // Valid for 24 hours

        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DISPATCHED',
                dispatchedAt: new Date(),
                deliveryOtp: otp,
                otpExpiresAt: otpExpiry,
                reviewerNote: note,
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        // Send OTP via email to buyer
        try {
            await this.emailService.sendEmail(
                updated.requester.email,
                '🔐 Delivery Confirmation OTP - Your Order Has Been Dispatched',
                this.getOtpEmailTemplate(updated, otp),
            );
        } catch (error) {
            console.error('Failed to send OTP email:', error);
        }

        // Notify the requester (buyer)
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '🚚 Order Dispatched - OTP Sent',
                body: `Your order for ${request.qty} units of ${request.inventoryLot.medicine.name} has been dispatched! Check your email for the delivery confirmation OTP.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return { 
            message: 'Verified and marked as dispatched. OTP sent to buyer for delivery confirmation.', 
            request: updated 
        };
    }

    // Get pending verification requests (ADMIN)
    async getPendingVerification() {
        const requests = await this.prisma.deliveryRequest.findMany({
            where: {
                status: 'APPROVED',
                invoiceUrl: { not: null },
            },
            include: {
                requester: { 
                    select: { 
                        id: true, 
                        name: true, 
                        email: true, 
                        phone: true 
                    } 
                },
                inventoryLot: {
                    include: {
                        medicine: true,
                        user: { 
                            select: { 
                                id: true, 
                                name: true, 
                                email: true 
                            } 
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return requests;
    }

    // Original markDispatched method (kept for backward compatibility if needed)
    async markDispatchedLegacy(requestId: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'APPROVED') {
            throw new BadRequestException('Request must be approved before dispatching');
        }

        // Generate OTP for delivery confirmation
        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry(24); // Valid for 24 hours

        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DISPATCHED',
                dispatchedAt: new Date(),
                deliveryOtp: otp,
                otpExpiresAt: otpExpiry,
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        // Send OTP via email
        try {
            await this.emailService.sendEmail(
                updated.requester.email,
                '🔐 Delivery Confirmation OTP - Your Order Has Been Dispatched',
                this.getOtpEmailTemplate(updated, otp),
            );
        } catch (error) {
            console.error('Failed to send OTP email:', error);
        }

        // Notify the requester
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '🚚 Order Dispatched - OTP Sent',
                body: `Your order for ${request.qty} units of ${request.inventoryLot.medicine.name} has been dispatched! Check your email for the delivery confirmation OTP.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return { message: 'Marked as dispatched. OTP sent to buyer for delivery confirmation.', request: updated };
    }

    // Confirm delivery with OTP (buyer)
    async confirmDelivery(requestId: string, userId: string, otp: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true } },
                inventoryLot: {
                    include: {
                        medicine: true,
                        sourceOrder: {
                            include: {
                                listing: true,
                            },
                        },
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        // Verify user is the requester
        if (request.requesterId !== userId) {
            throw new BadRequestException('You can only confirm your own deliveries');
        }

        // Verify delivery request is in DISPATCHED status
        if (request.status !== 'DISPATCHED') {
            throw new BadRequestException('Delivery must be dispatched before confirmation');
        }

        // Validate OTP
        if (!validateOtp(otp, request.deliveryOtp, request.otpExpiresAt)) {
            throw new BadRequestException('Invalid or expired OTP. Please check your email and try again.');
        }

        // Mark delivery as confirmed
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DELIVERED',
                deliveredAt: new Date(),
                otpVerifiedAt: new Date(),
            },
            include: {
                requester: { select: { name: true, email: true } },
                inventoryLot: {
                    include: {
                        medicine: true,
                        sourceOrder: {
                            include: {
                                listing: true,
                            },
                        },
                    },
                },
            },
        });

        // Update the associated order status to DELIVERED if it exists
        if (updated.inventoryLot.sourceOrder) {
            await this.prisma.order.update({
                where: { id: updated.inventoryLot.sourceOrder.id },
                data: {
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            });
        }

        // Send confirmation notification
        await this.prisma.notification.create({
            data: {
                userId: updated.requesterId,
                channel: 'INAPP',
                subject: '✅ Delivery Confirmed',
                body: `Your delivery of ${updated.qty} units of ${updated.inventoryLot.medicine.name} has been confirmed successfully!`,
                meta: { deliveryRequestId: updated.id },
            },
        });

        return {
            message: 'Delivery confirmed successfully! Your inventory has been updated.',
            request: updated,
        };
    }

    // Helper: Admin notification email template
    private getAdminNotificationTemplate(request: any): string {
        return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚚 New Delivery Request</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">A new physical delivery request has been submitted:</p>
          
          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Request Details</h3>
            <p style="margin: 5px 0;"><strong>Requester:</strong> ${request.requester.name} (${request.requester.email})</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${request.requester.phone || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${request.inventoryLot.medicine.name}</p>
            <p style="margin: 5px 0;"><strong>Manufacturer:</strong> ${request.inventoryLot.medicine.manufacturer?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${request.qty} units</p>
          </div>
          
          <p style="font-size: 14px; color: #6B7280;">Please review and approve/reject this request from the admin dashboard.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin/delivery-requests" 
             style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Review Request
          </a>
        </div>
      </div>
    `;
    }

    // Helper: Seller dispatch notification email template
    private getSellerDispatchTemplate(request: any, seller: any): string {
        return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📦 Dispatch Required</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hello ${seller.name},</p>
          <p style="font-size: 16px; color: #374151;">A delivery request has been approved. Please dispatch the following:</p>

          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Order Details</h3>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${request.inventoryLot.medicine.name}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${request.qty} units</p>
          </div>

          <div style="background: #DBEAFE; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1E40AF;">Deliver To</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${request.requester.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${request.requester.email}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${request.requester.phone || 'N/A'}</p>
          </div>

          <p style="font-size: 14px; color: #6B7280;">Please ensure timely dispatch and update the delivery status.</p>
        </div>
      </div>
    `;
    }

    // Helper: OTP email template for buyer
    private getOtpEmailTemplate(request: any, otp: string): string {
        return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚚 Order Dispatched!</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hello ${request.requester.name},</p>
          <p style="font-size: 16px; color: #374151;">Great news! Your order has been dispatched:</p>

          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Order Details</h3>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${request.inventoryLot.medicine.name}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${request.qty} units</p>
            <p style="margin: 5px 0;"><strong>Dispatched On:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="background: #DDD6FE; border: 2px solid #8B5CF6; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #6D28D9;">🔐 Your Delivery Confirmation OTP</h3>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
              <p style="font-size: 36px; font-weight: bold; color: #8B5CF6; margin: 0; letter-spacing: 8px;">${otp}</p>
            </div>
            <p style="font-size: 14px; color: #6D28D9; margin: 10px 0;">This OTP is valid for 24 hours</p>
          </div>

          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              <strong>⚠️ Important:</strong> Once you receive the delivery, please confirm it by entering this OTP in your Portfolio section.
              This will complete the transaction and update your inventory.
            </p>
          </div>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portfolio"
             style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Confirm Delivery
          </a>

          <p style="font-size: 12px; color: #9CA3AF; margin-top: 30px;">
            If you didn't request this delivery or have any concerns, please contact our support team immediately.
          </p>
        </div>
      </div>
    `;
    }
}
