import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { UserStatus } from '@prisma/client';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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
