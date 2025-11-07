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

    // Send approval email
    try {
      await this.emailService.sendApprovalEmail(updated.email, updated.name);
    } catch (error) {
      console.error('Failed to send approval email:', error);
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
}
