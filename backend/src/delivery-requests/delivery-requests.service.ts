import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { SmsService } from '../common/services/sms.service';
import { PdfService } from '../common/services/pdf.service';
import { generateOtp, generateOtpExpiry, validateOtp } from '../common/utils/otp.util';

const DELIVERY_RATES = {
    ROAD: 60, // ₹60 per kg
    AIR: 120, // ₹120 per kg
};

@Injectable()
export class DeliveryRequestsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private gcsService: GcsService,
        private smsService: SmsService,
        private pdfService: PdfService,
    ) { }

    // ==================== STEP 1: BUYER CREATES REQUEST ====================
    async createRequest(requesterId: string, inventoryLotId: string, qty: number) {
        if (!inventoryLotId) {
            throw new BadRequestException('Inventory lot ID is required');
        }

        // Validate inventory lot
        const lot = await this.prisma.inventoryLot.findUnique({
            where: { id: inventoryLotId },
            include: {
                user: true,
                medicine: { include: { manufacturer: true } },
                sourceOrder: {
                    include: {
                        listing: {
                            include: {
                                seller: { select: { id: true, name: true, email: true, phone: true, address: true } }
                            }
                        },
                        approvedProposal: {
                            select: { sellerInvoiceUrl: true }
                        }
                    }
                }
            },
        });

        if (!lot) throw new NotFoundException('Inventory lot not found');
        if (lot.userId !== requesterId) throw new BadRequestException('You can only request delivery for your own inventory');
        if (qty > lot.qty) throw new BadRequestException(`Requested quantity exceeds available stock (${lot.qty})`);

        // Check for duplicate active requests
        const existingRequest = await this.prisma.deliveryRequest.findFirst({
            where: {
                inventoryLotId,
                status: {
                    notIn: ['DELIVERED', 'CANCELLED', 'REJECTED']
                },
            },
        });

        if (existingRequest) {
            throw new BadRequestException('An active delivery request already exists for this lot');
        }

        const seller = lot.sourceOrder?.listing?.seller;
        if (!seller) {
            throw new NotFoundException('Original seller not found for this inventory');
        }

        // Create delivery request with AWAITING_SELLER_INFO status
        const request = await this.prisma.deliveryRequest.create({
            data: {
                requesterId,
                inventoryLotId,
                qty,
                status: 'AWAITING_SELLER_INFO',
                // Copy seller invoice from original buy proposal
                sellerInvoiceUrl: lot.sourceOrder?.approvedProposal?.sellerInvoiceUrl || null,
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
                                        seller: { select: { id: true, name: true, email: true, phone: true } }
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });

        // Notify seller to provide shipping details
        await this.prisma.notification.create({
            data: {
                userId: seller.id,
                channel: 'INAPP',
                subject: 'New Delivery Request - Provide Shipping Details',
                body: `${request.requester.name} requested physical delivery of ${qty} units of ${request.inventoryLot.medicine.name}. Please provide batch number, expiry date, weight, and transport mode.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        // Send email to seller
        this.emailService.sendEmail(
            seller.email,
            'Physical Delivery Request - Shipping Details Required',
            this.getSellerShippingFormTemplate(request, seller),
        ).catch(error => console.error('Failed to send seller email:', error));

        // Notify admin
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true, email: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: 'New Delivery Request',
                    body: `${request.requester.name} requested delivery of ${qty} units of ${request.inventoryLot.medicine.name}. Awaiting seller info.`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        return {
            message: 'Delivery request submitted. Seller will provide shipping details.',
            request,
        };
    }

    // ==================== STEP 2: SELLER PROVIDES SHIPPING DETAILS ====================
    async submitShippingDetails(
        requestId: string,
        sellerId: string,
        data: {
            batchNumber: string;
            expiryDate: string;
            parcelWeightKg: number;
            transportMode: 'ROAD' | 'AIR';
        },
        packageImage?: Express.Multer.File,
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true, address: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true } }
                                    }
                                }
                            }
                        }
                    }
                },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        
        // Verify seller
        const originalSellerId = request.inventoryLot.sourceOrder?.listing?.seller?.id;
        if (!originalSellerId || originalSellerId !== sellerId) {
            throw new BadRequestException('You can only provide details for your own inventory');
        }

        if (request.status !== 'AWAITING_SELLER_INFO') {
            throw new BadRequestException('Request is not awaiting seller information');
        }

        // Calculate delivery charge
        const rate = DELIVERY_RATES[data.transportMode];
        const deliveryCharge = data.parcelWeightKg * rate;

        // Upload package image if provided
        let packageImageUrl: string | null = null;
        if (packageImage) {
            packageImageUrl = await this.gcsService.uploadFile(
                packageImage,
                `delivery-requests/${requestId}`,
            );
        }

        // Update request
        const updated = await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                batchNumber: data.batchNumber,
                expiryDate: new Date(data.expiryDate),
                parcelWeightKg: data.parcelWeightKg,
                transportMode: data.transportMode,
                deliveryCharge,
                packageImageUrl,
                status: 'AWAITING_PAYMENT',
                sellerInfoSubmittedAt: new Date(),
            },
            include: {
                requester: { select: { name: true, email: true, phone: true, address: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                    }
                },
            },
        });

        // Generate proforma invoice PDF
        const proformaInvoiceUrl = await this.generateProformaInvoice(updated);

        // Update with proforma invoice URL
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: { proformaInvoiceUrl },
        });

        // Notify buyer to pay
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: 'Proforma Invoice Generated - Payment Required',
                body: `Delivery charge: ₹${deliveryCharge.toFixed(2)} (${data.parcelWeightKg}kg × ₹${rate}/kg via ${data.transportMode}). Please upload payment receipt.`,
                meta: { deliveryRequestId: request.id, proformaInvoiceUrl },
            },
        });

        // Send proforma invoice to buyer via email
        this.emailService.sendEmail(
            updated.requester.email,
            'Proforma Invoice - Delivery Charge Payment Required',
            this.getProformaInvoiceEmailTemplate(updated, proformaInvoiceUrl),
        ).catch(error => console.error('Failed to send proforma invoice email:', error));

        // Notify admin
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: 'Delivery - Awaiting Payment',
                    body: `Proforma invoice sent to ${updated.requester.name} for ${updated.inventoryLot.medicine.name}. Delivery charge: ₹${deliveryCharge.toFixed(2)}`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        return {
            message: 'Shipping details submitted. Proforma invoice sent to buyer.',
            deliveryCharge,
            proformaInvoiceUrl,
        };
    }

    // ==================== STEP 3: BUYER UPLOADS PAYMENT RECEIPT ====================
    async uploadPaymentReceipt(
        requestId: string,
        buyerId: string,
        paymentReceiptFile: Express.Multer.File
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.requesterId !== buyerId) throw new BadRequestException('You can only upload receipt for your own request');
        if (request.status !== 'AWAITING_PAYMENT') throw new BadRequestException('Request is not awaiting payment');

        // Upload payment receipt
        const paymentReceiptUrl = await this.gcsService.uploadFile(paymentReceiptFile, 'payment-receipts');

        // Update request
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                paymentReceiptUrl,
                status: 'PAYMENT_PENDING_VERIFICATION',
                paymentUploadedAt: new Date(),
            },
        });

        // Notify admin to verify payment
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true, email: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: 'Payment Receipt Uploaded - Verification Required',
                    body: `${request.requester.name} uploaded payment receipt for ${request.inventoryLot.medicine.name}. Please verify.`,
                    meta: { deliveryRequestId: request.id, paymentReceiptUrl },
                },
            });

            this.emailService.sendEmail(
                admin.email,
                'Payment Receipt - Verification Required',
                `<p>${request.requester.name} has uploaded payment receipt for delivery of ${request.inventoryLot.medicine.name}.</p>
                 <p>Delivery Charge: ₹${request.deliveryCharge}</p>
                 <p><a href="${paymentReceiptUrl}">View Payment Receipt</a></p>`,
            ).catch(error => console.error('Failed to send admin email:', error));
        }

        return {
            message: 'Payment receipt uploaded. Admin will verify.',
            paymentReceiptUrl,
        };
    }

    // Continue in next part...
    // ==================== STEP 4: ADMIN VERIFIES PAYMENT & ASSIGNS COURIER ====================
    async verifyPayment(
        requestId: string, 
        adminId: string, 
        approved: boolean, 
        note?: string,
        courierData?: {
            assignedCourierId: string;
            sourceAddress: string;
            destinationAddress: string;
        }
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true } },
                inventoryLot: {
                    include: {
                        medicine: true,
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true } }
                                    }
                                }
                            }
                        }
                    }
                },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.status !== 'PAYMENT_PENDING_VERIFICATION') {
            throw new BadRequestException('Request is not pending payment verification');
        }

        if (!approved) {
            // Payment rejected - notify buyer to re-upload
            await this.prisma.deliveryRequest.update({
                where: { id: requestId },
                data: {
                    status: 'AWAITING_PAYMENT',
                    reviewerNote: note,
                    paymentReceiptUrl: null, // Clear rejected receipt
                },
            });

            await this.prisma.notification.create({
                data: {
                    userId: request.requesterId,
                    channel: 'INAPP',
                    subject: 'Payment Receipt Rejected',
                    body: `Your payment receipt was rejected. Reason: ${note || 'Invalid receipt'}. Please upload a valid receipt.`,
                    meta: { deliveryRequestId: request.id },
                },
            });

            return { message: 'Payment rejected. Buyer notified to re-upload.' };
        }

        // Payment approved - directly assign courier and dispatch
        if (!courierData) {
            throw new BadRequestException('Courier assignment data is required for payment approval');
        }

        // Verify courier exists
        const courier = await this.prisma.user.findUnique({
            where: { id: courierData.assignedCourierId, roleCode: 'COURIER' },
            select: { id: true, name: true, email: true, phone: true },
        });

        if (!courier) throw new NotFoundException('Courier not found');

        // Update request - skip AWAITING_SELLER_INVOICE and AWAITING_ADMIN_DISPATCH
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'AWAITING_COURIER_PICKUP',
                paymentVerifiedAt: new Date(),
                reviewerNote: note,
                assignedCourierId: courierData.assignedCourierId,
                sourceAddress: courierData.sourceAddress,
                destinationAddress: courierData.destinationAddress,
                dispatchedAt: new Date(),
            },
        });

        // Notify courier
        await this.prisma.notification.create({
            data: {
                userId: courier.id,
                channel: 'INAPP',
                subject: 'New Pickup Assignment',
                body: `Pickup ${request.inventoryLot.medicine.name} from ${courierData.sourceAddress} and deliver to ${courierData.destinationAddress}`,
                meta: { deliveryRequestId: request.id },
            },
        });

        this.emailService.sendEmail(
            courier.email,
            'New Delivery Assignment',
            `<p>You have been assigned a new delivery:</p>
             <p>Medicine: ${request.inventoryLot.medicine.name}</p>
             <p>Quantity: ${request.qty}</p>
             <p>Pickup: ${courierData.sourceAddress}</p>
             <p>Delivery: ${courierData.destinationAddress}</p>`,
        ).catch(error => console.error('Failed to send courier email:', error));

        // Notify buyer
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: 'Payment Verified - Courier Assigned',
                body: `Your payment has been verified. Courier ${courier.name} has been assigned for pickup.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        this.emailService.sendEmail(
            request.requester.email,
            'Payment Verified - Courier Assigned',
            `<p>Your payment has been verified!</p>
             <p>Courier ${courier.name} has been assigned to deliver your order.</p>
             <p>Medicine: ${request.inventoryLot.medicine.name}</p>
             <p>Quantity: ${request.qty}</p>`,
        ).catch(error => console.error('Failed to send buyer email:', error));

        return { 
            message: 'Payment verified and courier assigned successfully.',
            courier: courier.name,
        };
    }

    // ==================== STEP 5: SELLER UPLOADS INVOICE ====================
    async uploadSellerInvoice(
        requestId: string,
        sellerId: string,
        invoiceFile: Express.Multer.File
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                inventoryLot: {
                    include: {
                        medicine: true,
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true } }
                                    }
                                }
                            }
                        }
                    }
                },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');

        const originalSellerId = request.inventoryLot.sourceOrder?.listing?.seller?.id;
        if (!originalSellerId || originalSellerId !== sellerId) {
            throw new BadRequestException('You can only upload invoice for your own inventory');
        }

        if (request.status !== 'AWAITING_SELLER_INVOICE') {
            throw new BadRequestException('Request is not awaiting seller invoice');
        }

        // Upload invoice
        const sellerInvoiceUrl = await this.gcsService.uploadFile(invoiceFile, 'seller-invoices');

        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                sellerInvoiceUrl,
                status: 'AWAITING_ADMIN_DISPATCH',
                sellerInvoiceUploadedAt: new Date(),
            },
        });

        // Notify admin to dispatch
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true, email: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: 'Seller Invoice Uploaded - Dispatch Required',
                    body: `Seller uploaded invoice for ${request.inventoryLot.medicine.name}. Please upload admin invoice and initiate dispatch.`,
                    meta: { deliveryRequestId: request.id, sellerInvoiceUrl },
                },
            });

            this.emailService.sendEmail(
                admin.email,
                'Seller Invoice Uploaded - Dispatch Required',
                `<p>Seller has uploaded invoice for ${request.inventoryLot.medicine.name}.</p>
                 <p><a href="${sellerInvoiceUrl}">View Seller Invoice</a></p>
                 <p>Please upload admin invoice, set addresses, and assign courier.</p>`,
            ).catch(error => console.error('Failed to send admin email:', error));
        }

        return {
            message: 'Invoice uploaded. Admin will initiate dispatch.',
            sellerInvoiceUrl,
        };
    }

    // ==================== STEP 6: ADMIN INITIATES DISPATCH ====================
    async initiateDispatch(
        requestId: string,
        adminId: string,
        data: {
            adminInvoiceFile: Express.Multer.File;
            sourceAddress: string;
            destinationAddress: string;
            assignedCourierId: string;
        }
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.status !== 'AWAITING_ADMIN_DISPATCH') {
            throw new BadRequestException('Request is not awaiting admin dispatch');
        }

        // Verify courier exists
        const courier = await this.prisma.user.findUnique({
            where: { id: data.assignedCourierId, roleCode: 'COURIER' },
            select: { id: true, name: true, email: true, phone: true },
        });

        if (!courier) throw new NotFoundException('Courier not found');

        // Upload admin invoice
        const adminInvoiceUrl = await this.gcsService.uploadFile(data.adminInvoiceFile, 'admin-invoices');

        // Update request
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                adminInvoiceUrl,
                sourceAddress: data.sourceAddress,
                destinationAddress: data.destinationAddress,
                assignedCourierId: data.assignedCourierId,
                status: 'AWAITING_COURIER_PICKUP',
                dispatchedAt: new Date(),
            },
        });

        // Notify courier
        await this.prisma.notification.create({
            data: {
                userId: courier.id,
                channel: 'INAPP',
                subject: 'New Pickup Assignment',
                body: `Pickup ${request.inventoryLot.medicine.name} from ${data.sourceAddress} and deliver to ${data.destinationAddress}`,
                meta: { deliveryRequestId: request.id },
            },
        });

        this.emailService.sendEmail(
            courier.email,
            'New Delivery Assignment',
            `<p>You have been assigned a new delivery:</p>
             <p>Medicine: ${request.inventoryLot.medicine.name}</p>
             <p>Quantity: ${request.qty}</p>
             <p>Pickup: ${data.sourceAddress}</p>
             <p>Delivery: ${data.destinationAddress}</p>
             <p><a href="${adminInvoiceUrl}">View Invoice</a></p>`,
        ).catch(error => console.error('Failed to send courier email:', error));

        // Notify buyer
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: 'Dispatch Initiated - Courier Assigned',
                body: `Your order has been assigned to courier ${courier.name}. Awaiting pickup.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return {
            message: 'Dispatch initiated. Courier assigned.',
            courier: courier.name,
        };
    }

    // ==================== STEP 7: COURIER ACCEPTS & UPDATES STATUS ====================
    async acceptDelivery(requestId: string, courierId: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.assignedCourierId !== courierId) {
            throw new BadRequestException('You are not assigned to this delivery');
        }
        if (request.status !== 'AWAITING_COURIER_PICKUP') {
            throw new BadRequestException('Delivery is not awaiting pickup');
        }

        // Update status to IN_TRANSIT
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'IN_TRANSIT',
                courierPickupAt: new Date(),
            },
        });

        // Notify buyer
        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: 'Delivery In Transit',
                body: `Your order for ${request.inventoryLot.medicine.name} is now in transit.`,
                meta: { deliveryRequestId: request.id },
            },
        });

        return { message: 'Delivery accepted and marked as in transit.' };
    }

    async updateCourierStatus(
        requestId: string,
        courierId: string,
        status: 'DISPATCHED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY',
        notes?: string
    ) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: { include: { medicine: true } },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.assignedCourierId !== courierId) {
            throw new BadRequestException('You are not assigned to this delivery');
        }

        const updateData: any = { status, courierNotes: notes };

        // Set timestamps based on status
        if (status === 'DISPATCHED') {
            updateData.courierPickupAt = new Date();
        }

        // Generate OTP when out for delivery
        if (status === 'OUT_FOR_DELIVERY') {
            const otp = generateOtp();
            const otpExpiry = generateOtpExpiry(24);
            updateData.deliveryOtp = otp;
            updateData.otpExpiresAt = otpExpiry;
            updateData.status = 'PENDING_OTP_VERIFICATION'; // Auto-transition

            // Send OTP to buyer
            this.emailService.sendEmail(
                request.requester.email,
                'Delivery OTP - Out for Delivery',
                this.getOtpEmailTemplate(request, otp),
            ).catch(error => console.error('Failed to send OTP email:', error));

            await this.prisma.notification.create({
                data: {
                    userId: request.requesterId,
                    channel: 'INAPP',
                    subject: 'Out for Delivery - OTP Sent',
                    body: `Your order is out for delivery. OTP sent to your email for confirmation.`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: updateData,
        });

        // Notify buyer of status change
        const statusMessages = {
            DISPATCHED: 'Courier picked up your order',
            IN_TRANSIT: 'Your order arrived at nearest hub',
            OUT_FOR_DELIVERY: 'Your order is out for delivery',
        };

        await this.prisma.notification.create({
            data: {
                userId: request.requesterId,
                channel: 'INAPP',
                subject: 'Delivery Status Update',
                body: statusMessages[status] || 'Delivery status updated',
                meta: { deliveryRequestId: request.id },
            },
        });

        return { message: 'Status updated successfully' };
    }

    // ==================== STEP 8: BUYER CONFIRMS DELIVERY WITH OTP ====================
    async confirmDeliveryWithOtp(requestId: string, buyerId: string, otp: string) {
        const request = await this.prisma.deliveryRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: { select: { id: true, name: true } },
                inventoryLot: { include: { medicine: true } },
                assignedCourier: { select: { id: true, name: true } },
            },
        });

        if (!request) throw new NotFoundException('Delivery request not found');
        if (request.requesterId !== buyerId) {
            throw new BadRequestException('You can only confirm your own deliveries');
        }
        if (request.status !== 'PENDING_OTP_VERIFICATION') {
            throw new BadRequestException('Delivery is not pending OTP verification');
        }

        // Validate OTP
        if (!validateOtp(otp, request.deliveryOtp, request.otpExpiresAt)) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // Mark as delivered
        await this.prisma.deliveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'DELIVERED',
                deliveredAt: new Date(),
                otpVerifiedAt: new Date(),
            },
        });

        // Notify admin
        const admins = await this.prisma.user.findMany({
            where: { roleCode: 'ADMIN' },
            select: { id: true },
        });

        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    channel: 'INAPP',
                    subject: 'Delivery Successful',
                    body: `${request.requester.name} confirmed delivery of ${request.inventoryLot.medicine.name}`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        // Notify courier
        if (request.assignedCourierId) {
            await this.prisma.notification.create({
                data: {
                    userId: request.assignedCourierId,
                    channel: 'INAPP',
                    subject: 'Delivery Confirmed',
                    body: `Buyer confirmed delivery of ${request.inventoryLot.medicine.name}`,
                    meta: { deliveryRequestId: request.id },
                },
            });
        }

        return { message: 'Delivery confirmed successfully!' };
    }

    // ==================== HELPER METHODS ====================
    
    // Get requests for buyer
    async getMyRequests(userId: string) {
        return this.prisma.deliveryRequest.findMany({
            where: { requesterId: userId },
            include: {
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                    },
                },
                assignedCourier: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get requests for seller
    async getSellerRequests(sellerId: string) {
        return this.prisma.deliveryRequest.findMany({
            where: {
                inventoryLot: {
                    sourceOrder: {
                        listing: {
                            sellerId: sellerId
                        }
                    }
                }
            },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get requests for courier
    async getCourierRequests(courierId: string) {
        return this.prisma.deliveryRequest.findMany({
            where: { assignedCourierId: courierId },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true, phone: true, address: true } }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get all requests (admin)
    async getAllRequests(status?: string) {
        const where = status ? { status: status as any } : {};
        return this.prisma.deliveryRequest.findMany({
            where,
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                inventoryLot: {
                    include: {
                        medicine: { include: { manufacturer: true } },
                        sourceOrder: {
                            include: {
                                listing: {
                                    include: {
                                        seller: { select: { id: true, name: true, email: true, phone: true } }
                                    }
                                }
                            }
                        }
                    },
                },
                assignedCourier: { select: { id: true, name: true, email: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Generate proforma invoice PDF - COMBINED medicine + delivery charge
    private async generateProformaInvoice(request: any): Promise<string> {
        // Get the original buy proposal to get medicine pricing
        const buyProposal = await this.prisma.buyProposal.findFirst({
            where: {
                approvedOrderId: request.inventoryLot.sourceOrderId,
            },
            include: {
                listing: {
                    include: {
                        medicine: { include: { manufacturer: true } }
                    }
                }
            }
        });

        if (!buyProposal) {
            throw new NotFoundException('Original buy proposal not found');
        }

        // Calculate medicine totals (from original buy proposal)
        const unitPrice = Number(buyProposal.listing.listPrice || buyProposal.listing.basePrice || 0);
        const gstPct = Number(buyProposal.listing.gstPercentage || 0);
        const medicineSubtotal = unitPrice * request.qty;
        const medicineGst = medicineSubtotal * (gstPct / 100);
        const medicineTotal = medicineSubtotal + medicineGst;

        // Delivery charge (no GST)
        const deliveryCharge = Number(request.deliveryCharge || 0);

        // Grand total
        const grandTotal = medicineTotal + deliveryCharge;

        // Create items array with medicine + delivery charge
        const items = [
            // Medicine item
            {
                hsn: '',
                productName: buyProposal.listing.medicine.name,
                pack: buyProposal.listing.medicine.packSize || '1',
                qty: request.qty,
                batch: request.batchNumber || buyProposal.confirmedBatchNo || 'TBD',
                mfg: new Date().toLocaleDateString('en-GB'),
                exp: request.expiryDate ? new Date(request.expiryDate).toLocaleDateString('en-GB') : 
                     (buyProposal.confirmedExpiryDate ? new Date(buyProposal.confirmedExpiryDate).toLocaleDateString('en-GB') : 'N/A'),
                mrp: Number(buyProposal.listing.medicine.mrp || 0),
                rate: unitPrice,
                dis: 0,
                sgst: gstPct / 2,
                sgstValue: medicineGst / 2,
                cgst: gstPct / 2,
                cgstValue: medicineGst / 2,
                amount: medicineTotal,
            },
            // Delivery charge item
            {
                hsn: '',
                productName: `Delivery Charge (${request.transportMode} - ${request.parcelWeightKg}kg)`,
                pack: '',
                qty: 1,
                batch: '',
                mfg: '',
                exp: '',
                mrp: 0,
                rate: deliveryCharge,
                dis: 0,
                sgst: 0,
                sgstValue: 0,
                cgst: 0,
                cgstValue: 0,
                amount: deliveryCharge,
            }
        ];

        const pdfBuffer = await this.pdfService.generateQuotationPDF({
            invoiceNo: `PI-${request.id.substring(0, 8).toUpperCase()}`,
            invoiceDate: new Date().toLocaleDateString('en-GB'),
            orderNo: request.id.substring(0, 8).toUpperCase(),
            orderDate: new Date(request.createdAt).toLocaleDateString('en-GB'),
            lrDate: '',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
            // BUYER details
            partyName: request.requester.name,
            partyAddress: request.requester.address || '',
            partyPhone: request.requester.phone || '',
            partyGSTIN: '',
            partyDLNo: '',
            items: items,
            totalSGST: medicineGst / 2,
            totalCGST: medicineGst / 2,
            grandTotal: grandTotal,
            totalItems: 2,
            totalQty: request.qty + 1,
        });

        const fileName = `proforma-invoice-${request.id}.pdf`;
        
        // Upload to GCS
        return await this.gcsService.uploadBuffer(pdfBuffer, 'proforma-invoices', fileName);
    }

    // Email templates
    private getSellerShippingFormTemplate(request: any, seller: any): string {
        return `
            <h2>Physical Delivery Request</h2>
            <p>Dear ${seller.name},</p>
            <p>${request.requester.name} has requested physical delivery of:</p>
            <ul>
                <li>Medicine: ${request.inventoryLot.medicine.name}</li>
                <li>Quantity: ${request.qty} units</li>
            </ul>
            <p>Please provide the following shipping details:</p>
            <ul>
                <li>Batch Number</li>
                <li>Expiry Date</li>
                <li>Parcel Weight (in KG)</li>
                <li>Transport Mode: Road (₹60/kg) or Air (₹120/kg)</li>
            </ul>
            <p>Login to your dashboard to submit these details.</p>
        `;
    }

    private getProformaInvoiceEmailTemplate(request: any, invoiceUrl: string): string {
        return `
            <h2>Proforma Invoice - Delivery Charge</h2>
            <p>Dear ${request.requester.name},</p>
            <p>Your delivery charge has been calculated:</p>
            <ul>
                <li>Medicine: ${request.inventoryLot.medicine.name}</li>
                <li>Weight: ${request.parcelWeightKg} kg</li>
                <li>Transport: ${request.transportMode}</li>
                <li>Rate: ₹${DELIVERY_RATES[request.transportMode]}/kg</li>
                <li><strong>Total: ₹${request.deliveryCharge}</strong></li>
            </ul>
            <p><a href="${invoiceUrl}">Download Proforma Invoice</a></p>
            <p>Please make the payment and upload the receipt in your portfolio section.</p>
        `;
    }

    private getOtpEmailTemplate(request: any, otp: string): string {
        return `
            <h2>Delivery Confirmation OTP</h2>
            <p>Dear ${request.requester.name},</p>
            <p>Your order is out for delivery!</p>
            <p>Medicine: ${request.inventoryLot.medicine.name}</p>
            <p>Quantity: ${request.qty} units</p>
            <h3 style="background: #1E40AF; color: white; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px;">
                ${otp}
            </h3>
            <p>Please provide this OTP to the courier upon delivery.</p>
            <p>OTP is valid for 24 hours.</p>
        `;
    }
}
