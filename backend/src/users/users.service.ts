import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { UserStatus } from '@prisma/client';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private gcsService: GcsService,
  ) {}

  async uploadKycDocuments(userId: string, documents: { [docTypeCode: string]: Express.Multer.File }) {
    const user = await this.findOne(userId);
    const uploadedDocs: any[] = [];

    for (const [docTypeCode, file] of Object.entries(documents)) {
      const docType = await this.prisma.kycDocumentType.findUnique({
        where: { code: docTypeCode },
      });

      if (!docType) continue;

      // Upload to GCS
      const fileUrl = await this.gcsService.uploadFile(file, `kyc/${userId}`);

      // Upsert document (update if exists, create if not)
      const kycDoc = await this.prisma.kycDocument.upsert({
        where: {
          uq_kyc_user_doc: {
            userId,
            docTypeId: docType.id,
          },
        },
        update: {
          fileUrl,
          status: 'PENDING',
          uploadedAt: new Date(),
        },
        create: {
          userId,
          docTypeId: docType.id,
          fileUrl,
          status: 'PENDING',
        },
      });

      uploadedDocs.push(kycDoc);
    }

    // CRITICAL FIX: Notify admins when KYC documents are uploaded for review
    if (uploadedDocs.length > 0) {
      try {
        const admins = await this.prisma.user.findMany({
          where: { roleCode: 'ADMIN' },
          select: { id: true, email: true },
        });

        // Create in-app notifications for all admins
        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              channel: 'INAPP',
              subject: '📄 KYC Documents Submitted for Review',
              body: `${user.name} (${user.email}) has uploaded ${uploadedDocs.length} KYC document(s) for review.`,
              meta: {
                type: 'KYC_DOCUMENTS_UPLOADED',
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                documentCount: uploadedDocs.length,
              },
              sentAt: new Date(),
            },
          });
        }

        console.log(`✅ Notified ${admins.length} admin(s) about KYC document upload from ${user.email}`);
      } catch (error) {
        console.error('⚠️ Failed to notify admins about KYC upload (non-critical):', error);
        // Don't throw - document upload was successful
      }
    }

    return {
      message: 'Documents uploaded successfully. Admin will review them shortly.',
      count: uploadedDocs.length,
    };
  }

  async findAll(filters?: { status?: UserStatus; roleCode?: string }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.roleCode && { roleCode: filters.roleCode }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Aliases for controller compatibility
  async getUsers(filters?: { status?: string; roleCode?: string }) {
    return this.findAll(filters as any);
  }

  async getUser(id: string) {
    return this.findOne(id);
  }

  async approveUser(id: string, reviewerNote?: string) {
    const user = await this.findOne(id);

    if (user.status === 'APPROVED') {
      throw new BadRequestException('User is already approved');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        status: true,
      },
    });

    // Send approval email asynchronously (non-blocking)
    this.emailService.sendApprovalEmail(updated.email, updated.name).catch(error => {
      console.error('Failed to send approval email:', error);
    });

    // CRITICAL FIX: Notify user that their profile is now 100% complete
    try {
      await this.prisma.notification.create({
        data: {
          userId: updated.id,
          channel: 'INAPP',
          subject: '✅ Profile Approved - 100% Complete!',
          body: `Congratulations! Your KYC documents have been approved. Your profile is now 100% complete and you have full access to all platform features.`,
          meta: {
            type: 'PROFILE_APPROVED',
            status: 'APPROVED',
          },
          sentAt: new Date(),
        },
      });

      console.log(`✅ Notified user ${updated.email} about profile approval`);
    } catch (error) {
      console.error('⚠️ Failed to notify user about approval (non-critical):', error);
    }

    return updated;
  }

  async rejectUser(id: string, reviewerNote?: string) {
    const user = await this.findOne(id);

    if (user.status === 'REJECTED') {
      throw new BadRequestException('User is already rejected');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        status: true,
      },
    });
  }

  async blockUser(id: string) {
    const user = await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'BLOCKED',
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        status: true,
        isActive: true,
      },
    });
  }

  async unblockUser(id: string) {
    const user = await this.findOne(id);

    if (user.status !== 'BLOCKED') {
      throw new BadRequestException('User is not blocked');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        status: true,
        isActive: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.findOne(id);

    // Delete user (cascade will handle related records)
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: `User ${user.name} (${user.email}) has been deleted successfully`,
      deletedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async getUserDocuments(userId: string) {
    const user = await this.findOne(userId);

    const documents = await this.prisma.kycDocument.findMany({
      where: { userId },
      include: {
        docType: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleCode: user.roleCode,
        status: user.status,
      },
      documents,
    };
  }

  async approveDocument(documentId: string, reviewerNote?: string) {
    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: {
        docType: true,
        user: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== 'PENDING') {
      throw new BadRequestException('Document already reviewed');
    }

    const updatedDoc = await this.prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        reviewerNote,
        reviewedAt: new Date(),
      },
      include: {
        docType: true,
      },
    });

    return {
      message: `Document ${document.docType.label} approved successfully`,
      document: updatedDoc,
    };
  }

  async rejectDocument(documentId: string, reviewerNote: string) {
    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: {
        docType: true,
        user: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== 'PENDING') {
      throw new BadRequestException('Document already reviewed');
    }

    if (!reviewerNote || reviewerNote.trim().length === 0) {
      throw new BadRequestException('Reviewer note is required for rejection');
    }

    const updatedDoc = await this.prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        reviewerNote,
        reviewedAt: new Date(),
      },
      include: {
        docType: true,
      },
    });

    return {
      message: `Document ${document.docType.label} rejected`,
      document: updatedDoc,
    };
  }
}
