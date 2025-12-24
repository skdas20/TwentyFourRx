import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

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
