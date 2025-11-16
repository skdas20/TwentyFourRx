import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Request() req,
    @Body() body: { listingId: string; qty: number },
  ) {
    return this.ordersService.create(req.user.userId, body.listingId, body.qty);
  }

  @Get()
  async findMyOrders(@Request() req) {
    return this.ordersService.findMyOrders(req.user.userId);
  }
}
