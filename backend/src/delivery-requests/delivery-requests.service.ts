import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { SmsService } from '../common/services/sms.service';
import { generateOtp, generateOtpExpiry, validateOtp } from '../common/utils/otp.util';

@Injectable()
export class DeliveryRequestsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private gcsService: GcsService,
        private smsService: SmsService,
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

        // Get the seller (owner) of this inventory lot
        const seller = await this.prisma.user.findUnique({
            where: { id: lot.userId },
            select: { id: true, name: true, email: true, phone: true },
        });

        if (!seller) {
            throw new NotFoundException('Seller not found for this inventory');
        }

        // Create the delivery request with AWAITING_SELLER status (seller needs to act first)
        const request = await this.prisma.deliveryRequest.create({
            data: {
                requesterId,
                inventoryLotId,
                qty,
                status: 'AWAITING_SELLER',
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

        // Send email to SELLER (not admin) - asynchronously
        this.emailService.sendEmail(
            seller.email,
            '📦 Physical Delivery Request - Action Required',
            this.getSellerDeliveryRequestTemplate(request, seller),
        ).catch(error => {
            console.error('Failed to send seller notification email:', error);
        });

        // Create in-app notification for SELLER
        await this.prisma.notification.create({
            data: {
                userId: seller.id,
                channel: 'INAPP',
                subject: '📦 Delivery Request Received',
                body: `${request.requester.name} has requested physical delivery of ${qty} units of ${request.inventoryLot.medicine.name}. Please upload courier receipt and confirm dispatch.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        // Send SMS to SELLER - asynchronously
        if (seller.phone) {
            const uploadLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller/deliveries`;
            this.smsService.sendDeliveryRequestedSms(
                seller.phone,
                request.inventoryLot.medicine.name,
                uploadLink,
            ).catch(error => {
                console.error('Failed to send SMS to seller:', error);
            });
        }

        return {
            message: 'Delivery request submitted successfully. The seller will be notified to process your request.',
            request,
        };
    }

    // Get delivery requests for a user (as requester or seller)
    async getMyRequests(userId: string) {
        return this.prisma.deliveryRequest.findMany({
            where: {
                OR: [
                    { requesterId: userId },
                    { inventoryLot: { userId: userId } }
                ]
            },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
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

    // Approve a delivery request (admin) - Directly generates OTP and marks as DISPATCHED
    async approveRequest(requestId: string, reviewerNote?: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: {
                            include: { manufacturer: true },
                        },
                        user: { select: { id: true, name: true, email: true } }, // seller
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException(`Request must be PENDING. Current status: ${request.status}`);
        }

        // Generate OTP for delivery confirmation
        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry(24); // Valid for 24 hours

        // Update status directly to DISPATCHED with OTP
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DISPATCHED',
                reviewerNote,
                reviewedAt: new Date(),
                dispatchedAt: new Date(),
                deliveryOtp: otp,
                otpExpiresAt: otpExpiry,
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: true,
                        user: { select: { id: true, name: true } }, // seller
                    },
                },
            },
        });

        // Send OTP via email to BUYER - asynchronously
        this.emailService.sendEmail(
            updated.requester.email,
            '🔐 Delivery OTP - Your Order Has Been Dispatched',
            this.getOtpEmailTemplate(updated, otp),
        ).catch(error => {
            console.error('Failed to send OTP email:', error);
        });

        // Notify the requester (buyer) - Order dispatched
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '🚚 Order Dispatched - OTP Sent',
                body: `Your order for ${request.qty} units of ${request.inventoryLot.medicine.name} has been dispatched! Check your email for the delivery confirmation OTP.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        // Notify the seller - Order approved and dispatched
        await this.prisma.notification.create({
            data: {
                userId: request.inventoryLot.user.id,
                channel: 'INAPP',
                subject: '✅ Delivery Approved',
                body: `Admin approved the delivery request for ${request.qty} units of ${request.inventoryLot.medicine.name}. OTP sent to buyer.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return {
            message: 'Delivery request approved and marked as dispatched. OTP sent to buyer.',
            request: updated
        };
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
    // Seller confirms delivery with receipt upload (SELLER)
    async markDispatched(requestId: string, sellerId: string, invoiceFile?: Express.Multer.File, trackingNumber?: string, deliveryPartner?: string) {
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
            throw new BadRequestException('You can only confirm dispatch for your own inventory');
        }

        if (request.status !== 'AWAITING_SELLER') {
            throw new BadRequestException('Request must be awaiting seller confirmation');
        }

        let invoiceUrl: string | undefined;

        // Upload courier receipt/documents if provided
        if (invoiceFile) {
            invoiceUrl = await this.gcsService.uploadFile(invoiceFile, 'delivery-receipts');
        }

        // Update request: Status AWAITING_SELLER → PENDING (for admin review)
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                invoiceUrl: invoiceUrl,
                trackingNumber: trackingNumber,
                deliveryPartner: deliveryPartner,
                status: 'PENDING', // Now pending admin approval
            },
            include: {
                requester: { select: { name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        // Notify ADMIN for approval (seller has confirmed and uploaded documents)
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true, email: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: '📦 Delivery Confirmation Pending Review',
                    body: `Seller has confirmed dispatch for ${request.qty} units of ${request.inventoryLot.medicine.name}. Please review documents and approve.`,
                    meta: { deliveryRequestId: request.id },
                },
            });

            // Send email to admin - asynchronously
            this.emailService.sendEmail(
                admin.email,
                '📦 Delivery Confirmation - Admin Approval Required',
                `<p>A seller has confirmed dispatch and uploaded documents for a delivery request.</p>
                 <p>Buyer: ${request.requester.name}</p>
                 <p>Medicine: ${request.inventoryLot.medicine.name}</p>
                 <p>Quantity: ${request.qty}</p>
                 ${invoiceUrl ? `<p>Courier Receipt/Documents: <a href="${invoiceUrl}">View Documents</a></p>` : ''}
                 <p>Please review and approve to generate OTP for buyer.</p>`,
            ).catch(error => {
                console.error('Failed to send admin email:', error);
            });
        }

        // Notify buyer that seller has confirmed
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '✅ Seller Confirmed Dispatch',
                body: `The seller has confirmed dispatch of ${request.qty} units of ${request.inventoryLot.medicine.name}. Awaiting admin approval.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return {
            message: 'Dispatch confirmed successfully. Admin will review and approve for delivery.',
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

        // Send OTP via email to buyer - asynchronously
        this.emailService.sendEmail(
            updated.requester.email,
            '🔐 Delivery Confirmation OTP - Your Order Has Been Dispatched',
            this.getOtpEmailTemplate(updated, otp),
        ).catch(error => {
            console.error('Failed to send OTP email:', error);
        });

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

        // Send OTP via email - asynchronously
        this.emailService.sendEmail(
            updated.requester.email,
            '🔐 Delivery Confirmation OTP - Your Order Has Been Dispatched',
            this.getOtpEmailTemplate(updated, otp),
        ).catch(error => {
            console.error('Failed to send OTP email:', error);
        });

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

    // Helper: Seller delivery request notification (initial notification)
    private getSellerDeliveryRequestTemplate(request: any, seller: any): string {
        return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📦 Physical Delivery Request</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hello ${seller.name},</p>
          <p style="font-size: 16px; color: #374151;">A buyer has requested physical delivery of medicine from your inventory:</p>

          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1F2937;">Request Details</h3>
            <p style="margin: 5px 0;"><strong>Buyer:</strong> ${request.requester.name}</p>
            <p style="margin: 5px 0;"><strong>Medicine:</strong> ${request.inventoryLot.medicine.name}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${request.qty} units</p>
          </div>

          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              <strong>⚠️ Action Required:</strong> Please upload courier receipt/shipping documents and confirm dispatch in your seller dashboard.
            </p>
          </div>

          <p style="font-size: 14px; color: #6B7280;">Once you confirm, the request will be sent to admin for final approval and OTP generation.</p>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller/deliveries"
             style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Delivery Request
          </a>
        </div>
      </div>
    `;
    }

    // Helper: Seller dispatch notification email template (admin approved, seller dispatching)
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
