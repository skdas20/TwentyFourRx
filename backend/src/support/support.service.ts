import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RespondToTicketDto } from './dto/respond-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, createTicketDto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: createTicketDto.subject,
        message: createTicketDto.message,
        deliveryRequestId: createTicketDto.deliveryRequestId,
        status: 'OPEN',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryRequest: true,
      },
    });

    // Notify all admins about new support ticket
    const admins = await this.prisma.user.findMany({
      where: { roleCode: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          channel: 'INAPP',
          subject: '🎫 New Support Ticket',
          body: `${ticket.user.name} created a support ticket: ${ticket.subject}`,
          meta: { supportTicketId: ticket.id },
        },
      });
    }

    return ticket;
  }

  async getMyTickets(userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        deliveryRequest: {
          select: {
            id: true,
            inventoryLot: {
              select: {
                medicine: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tickets;
  }

  async getAllTickets(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          deliveryRequest: {
            include: {
              inventoryLot: {
                include: {
                  medicine: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketById(ticketId: string, userId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryRequest: {
          include: {
            inventoryLot: {
              include: {
                medicine: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // If userId is provided (non-admin), verify ownership
    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('You can only view your own tickets');
    }

    return ticket;
  }

  async respondToTicket(ticketId: string, respondDto: RespondToTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        adminResponse: respondDto.adminResponse,
        status: 'IN_PROGRESS',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryRequest: true,
      },
    });

    // Notify user about admin response
    await this.prisma.notification.create({
      data: {
        userId: ticket.userId,
        channel: 'INAPP',
        subject: '💬 Admin Response to Your Support Ticket',
        body: `Admin responded to your ticket: ${ticket.subject}`,
        meta: { supportTicketId: ticket.id },
      },
    });

    return updatedTicket;
  }

  async resolveTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryRequest: true,
      },
    });

    return updatedTicket;
  }

  async reopenTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You can only reopen your own tickets');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'OPEN',
        resolvedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryRequest: true,
      },
    });

    return updatedTicket;
  }
}
