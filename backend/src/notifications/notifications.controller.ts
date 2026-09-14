import { Controller, Get, Post, Param, Query, Req, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { Request } from 'express';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.list(userId, {
      before,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.notificationsService.unreadCount(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.id;
    try {
      return await this.notificationsService.markRead(userId, id);
    } catch {
      throw new NotFoundException('Notification not found');
    }
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.notificationsService.markAllRead(userId);
  }
}
