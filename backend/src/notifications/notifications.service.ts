import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { Channel } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  channel?: Channel;
  subject: string;
  body: string;
  meta?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a new notification for a user
   */
  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        channel: dto.channel || Channel.INAPP,
        subject: dto.subject,
        body: dto.body,
        meta: dto.meta || {},
        sentAt: new Date(),
      },
    });

    this.logger.log(`📬 Notification created for user ${dto.userId}: ${dto.subject}`);
    return notification;
  }

  /**
   * Create notification and optionally send email
   */
  async createNotificationWithEmail(
    dto: CreateNotificationDto,
    userEmail: string,
    sendEmail: boolean = true,
  ) {
    // Create in-app notification
    const notification = await this.createNotification(dto);

    // Send email if requested (asynchronously in background)
    if (sendEmail && userEmail) {
      this.emailService.sendEmail(userEmail, dto.subject, dto.body)
        .then(() => this.logger.log(`📧 Email sent to ${userEmail}: ${dto.subject}`))
        .catch(error => this.logger.error(`Failed to send email to ${userEmail}:`, error));
    }

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, limit = 50, includeRead = true) {
    const where: any = { userId };
    if (!includeRead) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Notify seller when their listing is deprioritized due to lower price
   */
  async notifyListingDeprioritized(
    sellerId: string,
    sellerEmail: string,
    sellerName: string,
    medicineName: string,
    yourPrice: number,
    newLowerPrice: number,
  ) {
    const subject = 'Your Listing Has Been Deprioritized';
    const body = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #f59e0b;">Listing Priority Update</h2>
        <p>Dear ${sellerName},</p>
        <p>A new listing for <strong>${medicineName}</strong> has been created at a lower price.</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Price:</strong> ₹${yourPrice.toLocaleString()}</p>
          <p><strong>New Lower Price:</strong> ₹${newLowerPrice.toLocaleString()}</p>
        </div>
        <p>Your listing is still active but won't appear as the primary option in search results.</p>
        <p>Consider adjusting your price to remain competitive.</p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: sellerId,
        subject,
        body: `A new listing for ${medicineName} at ₹${newLowerPrice} is now lower than your price of ₹${yourPrice}. Your listing is deprioritized.`,
        meta: {
          type: 'LISTING_DEPRIORITIZED',
          medicineName,
          yourPrice,
          newLowerPrice,
        },
      },
      sellerEmail,
      true,
    );
  }

  /**
   * Notify seller about upcoming listing expiry (1 day before)
   */
  async notifyExpiryWarning(
    sellerId: string,
    sellerEmail: string,
    sellerName: string,
    listingId: string,
    medicineName: string,
    expiryDate: Date,
  ) {
    const subject = 'Listing Expiring Tomorrow - Action Required';
    const formattedDate = expiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const body = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #ef4444;">⚠️ Listing Expiring Soon</h2>
        <p>Dear ${sellerName},</p>
        <p>Your listing for <strong>${medicineName}</strong> will expire on <strong>${formattedDate}</strong>.</p>
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p>After expiry, your listing will be automatically deactivated and removed from search results.</p>
        </div>
        <p>To keep your listing active, please update the expiry date or create a new listing with fresh stock.</p>
        <p><a href="${process.env.FRONTEND_URL || 'https://24rx.in'}/dashboard/seller/listings" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Listings</a></p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: sellerId,
        subject,
        body: `Your listing for ${medicineName} expires on ${formattedDate}. Please update or renew it.`,
        meta: {
          type: 'LISTING_EXPIRY_WARNING',
          listingId,
          medicineName,
          expiryDate: expiryDate.toISOString(),
        },
      },
      sellerEmail,
      true,
    );
  }

  /**
   * Notify seller when listing has expired and been deactivated
   */
  async notifyListingExpired(
    sellerId: string,
    sellerEmail: string,
    sellerName: string,
    listingId: string,
    medicineName: string,
  ) {
    const subject = 'Listing Expired and Deactivated';
    const body = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #6b7280;">Listing Expired</h2>
        <p>Dear ${sellerName},</p>
        <p>Your listing for <strong>${medicineName}</strong> has expired and been automatically deactivated.</p>
        <p>To continue selling this medicine, please create a new listing with updated stock and expiry information.</p>
        <p><a href="${process.env.FRONTEND_URL || 'https://24rx.in'}/dashboard/seller/listings/new" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Create New Listing</a></p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: sellerId,
        subject,
        body: `Your listing for ${medicineName} has expired and been deactivated. Create a new listing to continue selling.`,
        meta: {
          type: 'LISTING_EXPIRED',
          listingId,
          medicineName,
        },
      },
      sellerEmail,
      true,
    );
  }


  /**
   * CRON: Check for expiring listings daily at 9 AM
   * Notifies sellers 1 day before their listing expires
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringListings() {
    this.logger.log('🔍 Checking for expiring listings...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find listings expiring tomorrow
      const expiringListings = await this.prisma.listing.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
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
            select: {
              name: true,
              form: true,
              strength: true,
            },
          },
        },
      });

      this.logger.log(`Found ${expiringListings.length} listings expiring tomorrow`);

      for (const listing of expiringListings) {
        const medicineName = `${listing.medicine.name} ${listing.medicine.strength || ''} ${listing.medicine.form}`;
        
        await this.notifyExpiryWarning(
          listing.seller.id,
          listing.seller.email,
          listing.seller.name,
          listing.id,
          medicineName,
          listing.expiryDate!,
        );
      }

      this.logger.log(`✅ Sent ${expiringListings.length} expiry warning notifications`);
    } catch (error) {
      this.logger.error('❌ Failed to check expiring listings:', error);
    }
  }

  /**
   * CRON: Deactivate expired listings daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredListings() {
    this.logger.log('🔍 Checking for expired listings to deactivate...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find expired active listings
      const expiredListings = await this.prisma.listing.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: {
            lt: today,
          },
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
            select: {
              name: true,
              form: true,
              strength: true,
            },
          },
        },
      });

      this.logger.log(`Found ${expiredListings.length} expired listings to deactivate`);

      for (const listing of expiredListings) {
        // Deactivate the listing
        await this.prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'INACTIVE' },
        });

        const medicineName = `${listing.medicine.name} ${listing.medicine.strength || ''} ${listing.medicine.form}`;

        // Notify seller
        await this.notifyListingExpired(
          listing.seller.id,
          listing.seller.email,
          listing.seller.name,
          listing.id,
          medicineName,
        );
      }

      this.logger.log(`✅ Deactivated ${expiredListings.length} expired listings`);
    } catch (error) {
      this.logger.error('❌ Failed to deactivate expired listings:', error);
    }
  }

  /**
   * Generic notification for various events
   */
  async notifyUser(
    userId: string,
    userEmail: string,
    subject: string,
    body: string,
    meta?: any,
    sendEmail: boolean = false,
  ) {
    return this.createNotificationWithEmail(
      { userId, subject, body, meta },
      userEmail,
      sendEmail,
    );
  }

  /**
   * Notify all sellers and admin about a new requirement
   */
  async notifySellersAndAdmin(
    medicineName: string,
    quantity: number,
    message: string,
    posterName: string,
    posterEmail: string
  ) {
    // 1. Find all sellers and admins
    const recipients = await this.prisma.user.findMany({
      where: {
        roleCode: { in: ['SELLER', 'ADMIN'] },
        isActive: true,
      },
      select: { id: true, email: true, roleCode: true },
    });

    const subject = `New Requirement Posted: ${medicineName}`;
    const body = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #2563eb;">New Requirement Posted</h2>
        <p>A user has posted a requirement for a medicine that is currently unavailable.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Medicine:</strong> ${medicineName}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Message:</strong> ${message || 'No additional message'}</p>
          <p><strong>Posted By:</strong> ${posterName} (${posterEmail})</p>
        </div>
        
        <p>Please check if you can fulfill this requirement by listing the medicine.</p>
      </div>
    `;

    // 2. Send notifications
    for (const recipient of recipients) {
      // Send email ONLY to admins, disable for sellers to prevent timeouts
      const shouldSendEmail = recipient.roleCode === 'ADMIN';
      
      await this.createNotificationWithEmail(
        {
          userId: recipient.id,
          subject,
          body: `New requirement: ${quantity} units of ${medicineName}. Posted by ${posterName}.`,
          meta: {
            type: 'NEW_REQUIREMENT',
            medicineName,
            quantity,
            message,
            posterEmail
          },
        },
        recipient.email,
        shouldSendEmail // Only admins get email
      );
    }

    this.logger.log(`📢 Notified ${recipients.length} sellers/admins about requirement for ${medicineName}`);
    return { count: recipients.length };
  }

  /**
   * NEW: Notify seller about new buy proposal awaiting confirmation
   */
  async notifySellerNewProposal(seller: { id: string; email: string; name: string }, proposal: any) {
    const medicineName = proposal.listing.medicine.name;
    const buyerName = proposal.buyer.name;
    const quantity = proposal.qty;
    const timeoutHours = 48;

    const subject = '🛒 New Buy Proposal - Confirmation Required';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Buy Proposal Awaiting Your Confirmation</h2>
        <p>Dear ${seller.name},</p>
        <p>A buyer has submitted a purchase proposal for your listed medicine:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Buyer:</td><td style="padding: 8px 0;">${buyerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${quantity} units</td></tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>⏰ Action Required</strong></p>
          <p style="margin: 5px 0 0 0; color: #92400e;">Please confirm stock availability, batch number, and expiry date within ${timeoutHours} hours, or the proposal will be auto-rejected.</p>
        </div>

        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller/proposals" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Proposal</a></p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          24Rx Team
        </p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: seller.id,
        subject,
        body: `${buyerName} wants to buy ${quantity} units of ${medicineName}. Please confirm within ${timeoutHours} hours.`,
        meta: {
          type: 'PROPOSAL_SELLER_CONFIRMATION_REQUIRED',
          proposalId: proposal.id,
          buyerName,
          medicineName,
          quantity,
        },
      },
      seller.email,
      true,
    );
  }

  /**
   * NEW: Notify seller - 24 hour reminder
   */
  async notifySellerReminder(seller: { id: string; email: string; name: string }, proposal: any) {
    const medicineName = proposal.listing.medicine.name;
    const buyerName = proposal.buyer.name;
    const quantity = proposal.qty;

    const subject = '⏰ Reminder: Buy Proposal Expires in 24 Hours';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⏰ Urgent Reminder</h2>
        <p>Dear ${seller.name},</p>
        <p>You have a pending buy proposal that will expire in <strong>24 hours</strong>:</p>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #92400e;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
            <tr><td style="padding: 8px 0; color: #92400e;">Buyer:</td><td style="padding: 8px 0;">${buyerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #92400e;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${quantity} units</td></tr>
          </table>
        </div>

        <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>⚠️ Expires in 24 hours</strong></p>
          <p style="margin: 5px 0 0 0; color: #991b1b;">If not confirmed, this proposal will be automatically rejected.</p>
        </div>

        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller/proposals" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Now</a></p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: seller.id,
        subject,
        body: `⏰ Reminder: Proposal for ${medicineName} (${quantity} units) expires in 24 hours. Please confirm now.`,
        meta: {
          type: 'PROPOSAL_REMINDER',
          proposalId: proposal.id,
          medicineName,
          quantity,
        },
      },
      seller.email,
      true,
    );
  }

  /**
   * NEW: Notify admin that seller confirmed proposal
   */
  async notifyAdminSellerConfirmed(proposal: any) {
    const admins = await this.prisma.user.findMany({
      where: { roleCode: 'ADMIN' },
      select: { id: true, email: true, name: true },
    });

    const medicineName = proposal.listing.medicine.name;
    const buyerName = proposal.buyer.name;
    const quantity = proposal.confirmedQty || proposal.qty;
    const batchNo = proposal.confirmedBatchNo || 'Not specified';
    const expiryDate = proposal.confirmedExpiryDate
      ? new Date(proposal.confirmedExpiryDate).toLocaleDateString('en-GB')
      : 'Not specified';

    const subject = '✅ Buy Proposal Confirmed by Seller - Review Required';

    for (const admin of admins) {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">✅ Seller Confirmed Buy Proposal</h2>
          <p>Dear ${admin.name},</p>
          <p>A seller has confirmed a buy proposal. Please review and approve:</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Buyer:</td><td style="padding: 8px 0;">${buyerName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${quantity} units</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Batch No:</td><td style="padding: 8px 0;">${batchNo}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Expiry Date:</td><td style="padding: 8px 0;">${expiryDate}</td></tr>
            </table>
          </div>

          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin/buy-proposals" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Proposal</a></p>
        </div>
      `;

      await this.createNotificationWithEmail(
        {
          userId: admin.id,
          subject,
          body: `Seller confirmed proposal for ${medicineName} (${quantity} units). Please review.`,
          meta: {
            type: 'PROPOSAL_ADMIN_REVIEW',
            proposalId: proposal.id,
            medicineName,
            quantity,
          },
        },
        admin.email,
        true,
      );
    }
  }

  /**
   * NEW: Notify buyer that seller modified quantity
   */
  async notifyBuyerQtyModified(buyer: { id: string; email: string; name: string }, proposal: any) {
    const medicineName = proposal.listing.medicine.name;
    const originalQty = proposal.qty;
    const confirmedQty = proposal.confirmedQty;
    const sellerNote = proposal.sellerNote || 'No additional notes';

    const subject = '🔄 Seller Modified Quantity - Approval Required';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Quantity Modified by Seller</h2>
        <p>Dear ${buyer.name},</p>
        <p>The seller has confirmed your buy proposal but modified the available quantity:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Requested Qty:</td><td style="padding: 8px 0; text-decoration: line-through;">${originalQty} units</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Available Qty:</td><td style="padding: 8px 0; font-weight: bold; color: #10b981;">${confirmedQty} units</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Seller Note:</td><td style="padding: 8px 0;">${sellerNote}</td></tr>
          </table>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>Action Required</strong></p>
          <p style="margin: 5px 0 0 0; color: #1e40af;">Please approve or reject the modified quantity.</p>
        </div>

        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-proposals" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Approve</a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-proposals" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reject</a>
        </p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: buyer.id,
        subject,
        body: `Seller modified quantity for ${medicineName} from ${originalQty} to ${confirmedQty} units. Please approve or reject.`,
        meta: {
          type: 'PROPOSAL_QUANTITY_MODIFIED',
          proposalId: proposal.id,
          medicineName,
          originalQty,
          confirmedQty,
        },
      },
      buyer.email,
      true,
    );
  }

  /**
   * NEW: Notify buyer that proposal was rejected (timeout or buyer rejection)
   */
  async notifyBuyerProposalRejected(
    buyer: { id: string; email: string; name: string },
    proposal: any,
    reason: 'timeout' | 'buyer_rejected' | 'other',
  ) {
    const medicineName = proposal.listing.medicine.name;
    const quantity = proposal.qty;

    let subject = '❌ Buy Proposal Rejected';
    let reasonText = 'The proposal was rejected.';

    if (reason === 'timeout') {
      subject = '⏰ Buy Proposal Auto-Rejected - Seller Timeout';
      reasonText = 'The seller did not respond within 48 hours, so the proposal was automatically rejected.';
    } else if (reason === 'buyer_rejected') {
      subject = '❌ Buy Proposal Rejected';
      reasonText = 'You rejected the modified quantity from the seller.';
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Buy Proposal Rejected</h2>
        <p>Dear ${buyer.name},</p>
        <p>Your buy proposal for <strong>${medicineName}</strong> (${quantity} units) has been rejected.</p>

        <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
          <p style="margin: 5px 0 0 0; color: #991b1b;">${reasonText}</p>
        </div>

        <p>You can browse other listings or create a new proposal.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/browse-medicines" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Browse Medicines</a></p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: buyer.id,
        subject,
        body: `Your proposal for ${medicineName} (${quantity} units) was rejected. ${reasonText}`,
        meta: {
          type: 'PROPOSAL_REJECTED',
          proposalId: proposal.id,
          medicineName,
          quantity,
          reason,
        },
      },
      buyer.email,
      true,
    );
  }

  /**
   * NEW: Notify buyer that seller confirmed the proposal (full quantity)
   */
  async notifyBuyerSellerConfirmed(buyer: { id: string; email: string; name: string }, proposal: any) {
    const medicineName = proposal.listing.medicine.name;
    const quantity = proposal.qty;
    const batchNo = proposal.confirmedBatchNo;
    const expiryDate = new Date(proposal.confirmedExpiryDate).toLocaleDateString();

    const subject = '✅ Seller Confirmed Your Proposal';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Seller Confirmed Your Proposal</h2>
        <p>Dear ${buyer.name},</p>
        <p>Great news! The seller has confirmed your buy proposal and verified stock availability.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Quantity:</td><td style="padding: 8px 0; font-weight: bold; color: #10b981;">${quantity} units</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Batch No:</td><td style="padding: 8px 0;">${batchNo}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Expiry Date:</td><td style="padding: 8px 0;">${expiryDate}</td></tr>
          </table>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>Next Step</strong></p>
          <p style="margin: 5px 0 0 0; color: #1e40af;">Your proposal is now being reviewed by our admin team. Once approved, the Proforma Invoice will be sent to your email.</p>
        </div>

        <p>You will be notified when the PI is ready.</p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: buyer.id,
        subject,
        body: `Seller confirmed your proposal for ${medicineName} (${quantity} units). Admin review in progress.`,
        meta: {
          type: 'PROPOSAL_SELLER_CONFIRMED',
          proposalId: proposal.id,
          medicineName,
          quantity,
        },
      },
      buyer.email,
      true,
    );
  }

  /**
   * NEW: Notify seller to upload invoice after admin approval
   */
  async notifySellerUploadInvoice(seller: { id: string; email: string; name: string }, proposal: any) {
    const medicineName = proposal.listing.medicine.name;
    const quantity = proposal.qty;
    const buyerName = proposal.buyer.name;

    const subject = '📄 Upload Invoice - Sale Approved';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Sale Approved - Invoice Required</h2>
        <p>Dear ${seller.name},</p>
        <p>Great news! Your sale has been approved by the admin. Please upload your sales invoice to proceed.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Medicine:</td><td style="padding: 8px 0; font-weight: bold;">${medicineName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Buyer:</td><td style="padding: 8px 0;">${buyerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${quantity} units</td></tr>
          </table>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>Invoice Details (for your reference):</strong></p>
          <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">
            <strong>D.L. No:</strong> JH-RNS-15350015301<br>
            <strong>GSTIN:</strong> 20GAKPK4400G1Z7<br>
            <strong>E-Mail:</strong> 24rxmedicalsupply@gmail.com
          </p>
        </div>

        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller/proposals" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Upload Invoice</a>
        </p>
      </div>
    `;

    return this.createNotificationWithEmail(
      {
        userId: seller.id,
        subject,
        body: `Sale approved for ${medicineName} (${quantity} units). Please upload your sales invoice.\n\nInvoice Details:\nD.L. No: JH-RNS-15350015301\nGSTIN: 20GAKPK4400G1Z7\nE-Mail: 24rxmedicalsupply@gmail.com`,
        meta: {
          type: 'UPLOAD_INVOICE',
          proposalId: proposal.id,
          buyProposalId: proposal.id,
          medicineName,
          quantity,
        },
      },
      seller.email,
      true,
    );
  }

  /**
   * NEW: Notify buyer that PI has been generated and sent (IN-APP ONLY)
   */
  async notifyBuyerPIGenerated(buyer: { id: string; email: string; name: string }, proposal: any, orderId: string) {
    const medicineName = proposal.listing.medicine.name;
    const quantity = proposal.qty;

    const subject = '📄 Proforma Invoice Generated - Payment Required';

    // Only create in-app notification (email with PI is sent separately)
    return this.createNotification({
      userId: buyer.id,
      subject,
      body: `PI generated for ${medicineName} (${quantity} units). Please check your email and upload payment confirmation.`,
      meta: {
        type: 'PROPOSAL_PI_GENERATED',
        proposalId: proposal.id,
        orderId,
        medicineName,
        quantity,
      },
    });
  }
}
