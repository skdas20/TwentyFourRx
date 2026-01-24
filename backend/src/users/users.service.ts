import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { UserStatus } from '@prisma/client';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { PdfMergeService } from '../common/services/pdf-merge.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private gcsService: GcsService,
    private pdfMergeService: PdfMergeService,
  ) {}

  async uploadKycDocuments(userId: string, documents: { [docTypeCode: string]: Express.Multer.File | Express.Multer.File[] }) {
    const user = await this.findOne(userId);
    const uploadedDocs: any[] = [];

    for (const [docTypeCode, fileOrFiles] of Object.entries(documents)) {
      const docType = await this.prisma.kycDocumentType.findUnique({
        where: { code: docTypeCode },
      });

      if (!docType) continue;

      // Handle both single file and multiple files
      const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      
      let fileToUpload: Express.Multer.File;
      
      // If multiple files, merge them into a PDF
      if (files.length > 1) {
        console.log(`📄 Merging ${files.length} files for ${docTypeCode} into PDF...`);
        
        // Check if all files are images
        const allImages = files.every(f => this.pdfMergeService.isImage(f.mimetype));
        
        if (allImages) {
          // Merge images into PDF
          const pdfBuffer = await this.pdfMergeService.mergeImagesToPdf(files);
          
          // Create a new file object for the merged PDF
          fileToUpload = {
            ...files[0],
            buffer: pdfBuffer,
            mimetype: 'application/pdf',
            originalname: `${docTypeCode}_merged.pdf`,
            size: pdfBuffer.length,
          } as Express.Multer.File;
          
          console.log(`✅ Merged ${files.length} images into PDF (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
        } else {
          // If not all images, just use the first file (fallback)
          console.log(`⚠️  Not all files are images, using first file only`);
          fileToUpload = files[0];
        }
      } else {
        // Single file, use as is
        fileToUpload = files[0];
      }

      // Upload to GCS
      const fileUrl = await this.gcsService.uploadFile(fileToUpload, `kyc/${userId}`);

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

    // Notify admins when KYC documents are uploaded for review (in-app + email)
    if (uploadedDocs.length > 0) {
      try {
        const admins = await this.prisma.user.findMany({
          where: { roleCode: 'ADMIN' },
          select: { id: true, email: true, name: true },
        });

        for (const admin of admins) {
          // Create in-app notification
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

          // Send email notification to admin
          if (admin.email) {
            const emailBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New KYC Documents for Review</h2>
                <p>Dear ${admin.name || 'Admin'},</p>
                <p>A user has submitted KYC documents for your review:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">User:</td><td style="padding: 8px 0; font-weight: bold;">${user.name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;">${user.email}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Documents Uploaded:</td><td style="padding: 8px 0; font-weight: bold;">${uploadedDocs.length}</td></tr>
                  </table>
                </div>
                <p>Please login to the admin dashboard to review and approve/reject the documents.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin"
                   style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Review Documents
                </a>
              </div>
            `;
            this.emailService.sendEmail(
              admin.email,
              `KYC Documents Submitted - ${user.name}`,
              emailBody,
            ).catch(err => console.error('Failed to send KYC email to admin:', err));
          }
        }

        console.log(`✅ Notified ${admins.length} admin(s) about KYC document upload from ${user.email}`);
      } catch (error) {
        console.error('Failed to notify admins about KYC upload (non-critical):', error);
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

    // Delete all related records manually (not all have onDelete: Cascade)
    await this.prisma.$transaction(async (tx) => {
      // Delete inventory lots
      await tx.inventoryLot.deleteMany({ where: { userId: id } });
      // Delete buy proposals (as buyer)
      await tx.buyProposal.deleteMany({ where: { buyerId: id } });
      // Delete orders (as buyer)
      await tx.order.deleteMany({ where: { buyerId: id } });
      // Delete holds (as trader)
      await tx.hold.deleteMany({ where: { traderId: id } });
      // Delete listings (as seller)
      await tx.listing.deleteMany({ where: { sellerId: id } });
      // Delete medicine proposals
      await tx.medicineProposal.deleteMany({ where: { sellerId: id } });
      // Delete medicine contributions
      await tx.medicineContribution.deleteMany({ where: { contributorId: id } });
      // Delete bulk listing requests
      await tx.bulkListingRequest.deleteMany({ where: { sellerId: id } });
      // Delete support tickets
      await tx.supportTicket.deleteMany({ where: { userId: id } });
      // Delete delivery requests
      await tx.deliveryRequest.deleteMany({ where: { requesterId: id } });
      // Now delete the user (cascades will handle notifications, watchlists, kyc docs, alerts, tokens)
      await tx.user.delete({ where: { id } });
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
