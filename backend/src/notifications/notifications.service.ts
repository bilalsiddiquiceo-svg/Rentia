import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const DEFAULT_LIMIT = 20;

export interface CreateNotificationInput {
  type?: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: userId,
        type: data.type ?? 'message',
        title: data.title,
        body: data.body,
        link: data.link,
        metadata: data.metadata,
      },
    });
    return this.mapNotification(notification);
  }

  async list(userId: string, opts: { before?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), 50);

    const where: Prisma.NotificationWhereInput = {
      user_id: userId,
      ...(opts.before ? { created_at: { lt: new Date(opts.before) } } : {}),
    };

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = items.slice(0, limit);

    return {
      items: page.map((n) => this.mapNotification(n)),
      hasMore,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { user_id: userId, read_at: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, user_id: userId },
    });
    if (!existing) throw new Error('Notification not found');
    if (existing.read_at) return { ok: true };

    await this.prisma.notification.update({
      where: { id },
      data: { read_at: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return { ok: true };
  }

  mapNotification(n: any) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      metadata: n.metadata,
      readAt: n.read_at,
      createdAt: n.created_at,
    };
  }
}
