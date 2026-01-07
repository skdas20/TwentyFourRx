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

    // Send email if requested
    if (sendEmail && userEmail) {
      try {
        await this.emailService.sendEmail(userEmail, dto.subject, dto.body);
        this.logger.log(`📧 Email sent to ${userEmail}: ${dto.subject}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${userEmail}:`, error);
      }
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
}
