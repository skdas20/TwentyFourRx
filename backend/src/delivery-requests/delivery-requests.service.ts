import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class DeliveryRequestsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
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
    async markDispatched(requestId: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) {
            throw new NotFoundException('Delivery request not found');
        }

        if (request.status !== 'APPROVED') {
            throw new BadRequestException('Request must be approved before dispatching');
        }

        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DISPATCHED',
                dispatchedAt: new Date(),
            },
        });

        // Notify the requester
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: '🚚 Order Dispatched',
                body: `Your order for ${request.qty} units of ${request.inventoryLot.medicine.name} has been dispatched!`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return { message: 'Marked as dispatched', request: updated };
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
}
