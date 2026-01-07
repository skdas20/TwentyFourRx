import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class PostRequirementDto {
  @IsString()
  medicineName: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  message: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Post a new requirement (Notifies sellers and admins)
   */
  @Post('requirements')
  async postRequirement(@Request() req, @Body() dto: PostRequirementDto) {
    // Basic validation
    if (!dto.medicineName || !dto.quantity) {
      throw new BadRequestException('Medicine name and quantity are required');
    }

    const user = req.user;
    return this.notificationsService.notifySellersAndAdmin(
      dto.medicineName,
      dto.quantity,
      dto.message,
      user.name || 'User',
      user.email
    );
  }

  /**
   * Get all notifications for the current user
   */
  @Get()
  async getNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('includeRead') includeRead?: string,
  ) {
    const userId = req.user.sub;
    return this.notificationsService.getUserNotifications(
      userId,
      limit ? parseInt(limit, 10) : 50,
      includeRead !== 'false',
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Mark a specific notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read' };
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.sub;
    const result = await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read', count: result.count };
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.notificationsService.deleteNotification(id, userId);
    return { message: 'Notification deleted' };
  }
}
