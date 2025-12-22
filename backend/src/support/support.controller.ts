import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RespondToTicketDto } from './dto/respond-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  async createTicket(@CurrentUser() user: any, @Body() createTicketDto: CreateTicketDto) {
    return this.supportService.createTicket(user.sub, createTicketDto);
  }

  @Get('my')
  async getMyTickets(@CurrentUser() user: any) {
    return this.supportService.getMyTickets(user.sub);
  }

  @Get()
  @Roles('ADMIN')
  async getAllTickets(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.supportService.getAllTickets(page, limit, status);
  }

  @Get(':id')
  async getTicketById(@Param('id') ticketId: string, @CurrentUser() user: any) {
    // Admin can view any ticket, users can only view their own
    const userId = user.roleCode === 'ADMIN' ? undefined : user.sub;
    return this.supportService.getTicketById(ticketId, userId);
  }

  @Post(':id/respond')
  @Roles('ADMIN')
  async respondToTicket(
    @Param('id') ticketId: string,
    @Body() respondDto: RespondToTicketDto,
  ) {
    return this.supportService.respondToTicket(ticketId, respondDto);
  }

  @Post(':id/resolve')
  @Roles('ADMIN')
  async resolveTicket(@Param('id') ticketId: string) {
    return this.supportService.resolveTicket(ticketId);
  }

  @Post(':id/reopen')
  async reopenTicket(@Param('id') ticketId: string, @CurrentUser() user: any) {
    return this.supportService.reopenTicket(ticketId, user.sub);
  }
}
