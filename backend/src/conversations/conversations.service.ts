import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SendMessageDto,
  EditMessageDto,
  PresignChatUploadDto,
} from './dto/conversation.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';

const DEFAULT_CHAT_BUCKET = 'chat-attachments';
const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_ATTACHMENTS = 6;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const PREVIEW_LENGTH = 90;
const INBOX_CACHE_TTL_MS = 3_000;
const INBOX_LIMIT = 100;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly bucket: string;
  private bucketReady = false;
  private readonly inboxCache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.bucket = this.configService.get('SUPABASE_CHAT_BUCKET', DEFAULT_CHAT_BUCKET);
  }

  // ── Get or create ───────────────────────────────────────────

  async getOrCreate(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, owner_id: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.owner_id === userId) {
      throw new BadRequestException('You cannot message yourself about your own property');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { property_id_tenant_id: { property_id: propertyId, tenant_id: userId } },
    });

    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          property_id: propertyId,
          tenant_id: userId,
          owner_id: property.owner_id,
        },
      }));

    return this.detail(userId, conversation.id);
  }

  // ── Inbox ───────────────────────────────────────────────────

  async list(userId: string) {
    const cached = this.inboxCache.get(userId);
    if (cached) {
      if (cached.expiresAt > Date.now()) return cached.data;
      this.inboxCache.delete(userId);
    }

    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ tenant_id: userId }, { owner_id: userId }] },
      orderBy: { updated_at: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        tenant: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { created_at: 'desc' }, take: 1 },
        _count: {
          select: {
            messages: {
              where: { sender_id: { not: userId }, read_at: null },
            },
          },
        },
      },
      take: INBOX_LIMIT,
    });

    const result = conversations.map((c) => this.mapInboxItem(c, userId));
    this.inboxCache.set(userId, { data: result, expiresAt: Date.now() + INBOX_CACHE_TTL_MS });
    return result;
  }

  // ── Detail ──────────────────────────────────────────────────

  async detail(userId: string, id: string) {
    const full = await this.prisma.conversation.findFirst({
      where: { id, OR: [{ tenant_id: userId }, { owner_id: userId }] },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            photos: true,
            status: true,
            city: true,
            monthly_rent: true,
          },
        },
        tenant: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
    if (!full) throw new NotFoundException('Conversation not found');

    const otherUser =
      full.tenant_id === userId ? full.owner : full.tenant;

    return {
      id: full.id,
      propertyId: full.property_id,
      property: {
        id: full.property.id,
        title: full.property.title,
        photo: full.property.photos[0] ?? null,
        status: full.property.status,
        city: full.property.city,
        monthlyRent: full.property.monthly_rent,
      },
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
      },
      createdAt: full.created_at,
      updatedAt: full.updated_at,
    };
  }

  // ── Messages ────────────────────────────────────────────────

  async messages(
    userId: string,
    id: string,
    opts: { before?: string; limit?: number } = {},
  ) {
    const limit = Math.min(Math.max(opts.limit ?? DEFAULT_MESSAGE_LIMIT, 1), 50);

    const where = {
      conversation_id: id,
      // Participant check baked into the same query — no extra round trip.
      conversation: { OR: [{ tenant_id: userId }, { owner_id: userId }] },
      ...(opts.before ? { created_at: { lt: new Date(opts.before) } } : {}),
    };

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const oldest = page[page.length - 1];

    return {
      items: page.reverse().map((m) => this.mapMessage(m)),
      hasMore,
      nextCursor: oldest ? oldest.created_at.toISOString() : null,
    };
  }

  // ── Send ────────────────────────────────────────────────────

  async send(userId: string, id: string, dto: SendMessageDto) {
    const conversation = await this.assertParticipant(userId, id);

    const text = dto.text?.trim() ?? '';
    const attachments = dto.attachmentUrls ?? [];
    if (!text && attachments.length === 0) {
      throw new BadRequestException('Message text or an attachment is required');
    }
    if (attachments.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(`At most ${MAX_ATTACHMENTS} attachments per message`);
    }

    const receiverId =
      conversation.tenant_id === userId ? conversation.owner_id : conversation.tenant_id;

    const [sender, notificationMeta] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
      this.prisma.conversation.findUnique({
        where: { id },
        select: { property_id: true },
      }),
    ]);

    const preview = this.makePreview(text, attachments.length);
    const now = new Date();

      // All writes in ONE batched transaction = one DB round trip.
    const [message, , notification] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversation_id: id,
          sender_id: userId,
          text: text || null,
          attachments,
        },
      }),
      this.prisma.conversation.update({
        where: { id },
        data: { last_message_at: now, last_message_preview: preview },
      }),
      this.prisma.notification.create({
        data: {
          user_id: receiverId,
          type: 'message',
          title: 'New message',
          body: preview,
          link: `/app/messages/${id}`,
          metadata: {
            conversationId: id,
            propertyId: notificationMeta?.property_id,
            senderId: userId,
          },
        },
      }),
    ]);

    this.invalidateInbox(userId);
    this.invalidateInbox(receiverId);

    return {
      message: this.mapMessage(message),
      notification: this.notificationsService.mapNotification(notification),
      senderName: sender?.name ?? sender?.email?.split('@')[0] ?? 'User',
      conversation: this.brief(conversation),
      receiverId,
    };
  }

  private invalidateInbox(userId: string) {
    this.inboxCache.delete(userId);
  }

  // ── Mark read ───────────────────────────────────────────────

  async markRead(userId: string, id: string) {
    await this.assertParticipant(userId, id);
    const readAt = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversation_id: id,
        sender_id: { not: userId },
        read_at: null,
      },
      data: { read_at: readAt },
    });
    return { ok: true, readAt };
  }

  // ── Edit ────────────────────────────────────────────────────

  async editMessage(userId: string, conversationId: string, messageId: string, dto: EditMessageDto) {
    const conversation = await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversation_id: conversationId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    if (message.deleted_at) {
      throw new BadRequestException('This message was deleted');
    }
    if (Date.now() - message.created_at.getTime() > EDIT_WINDOW_MS) {
      throw new BadRequestException('Messages can only be edited within 15 minutes');
    }

    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Message text is required');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { text, edited_at: new Date() },
    });

    return {
      message: this.mapMessage(updated),
      conversation: this.brief(conversation),
    };
  }

  // ── Delete (soft) ───────────────────────────────────────────

  async deleteMessage(userId: string, conversationId: string, messageId: string) {
    const conversation = await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversation_id: conversationId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    if (message.deleted_at) {
      throw new BadRequestException('This message is already deleted');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deleted_at: new Date(), text: null },
    });

    return { conversation: this.brief(conversation), messageId };
  }

  // ── Participant helpers ─────────────────────────────────────

  async getPeer(userId: string, conversationId: string): Promise<string | null> {
    const c = await this.assertParticipant(userId, conversationId);
    return c.tenant_id === userId ? c.owner_id : c.tenant_id;
  }

  // ── Attachment presign ──────────────────────────────────────

  async presignUpload(userId: string, dto: PresignChatUploadDto) {
    if (!dto.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image attachments are supported');
    }
    await this.ensureBucket();

    const ext = path.extname(dto.fileName) || '.jpg';
    const key = `chats/${userId}/${randomUUID()}${ext}`;

    const { data, error } = await this.supabase
      .getAdminClient()
      .storage.from(this.bucket)
      .createSignedUploadUrl(key);

    if (error) {
      this.logger.error('Presign error: ' + error.message);
      throw new BadRequestException('Failed to create upload URL');
    }

    const { data: pubData } = this.supabase
      .getAdminClient()
      .storage.from(this.bucket)
      .getPublicUrl(key);

    return {
      uploadUrl: data.signedUrl,
      path: data.path,
      publicUrl: pubData.publicUrl,
    };
  }

  // ── Private helpers ─────────────────────────────────────────

  private async assertParticipant(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, OR: [{ tenant_id: userId }, { owner_id: userId }] },
      select: { id: true, property_id: true, tenant_id: true, owner_id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private brief(conversation: {
    id: string;
    property_id: string;
    tenant_id: string;
    owner_id: string;
  }) {
    return {
      id: conversation.id,
      property_id: conversation.property_id,
      tenant_id: conversation.tenant_id,
      owner_id: conversation.owner_id,
    };
  }

  private mapInboxItem(c: any, userId: string) {
    const otherUser =
      c.tenant_id === userId ? c.owner : c.tenant;

    const last = c.messages[0];

    return {
      id: c.id,
      property: {
        id: c.property.id,
        title: c.property.title,
        status: c.property.status,
      },
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
      },
      // Inbox card only renders preview text + sender + time — skip the full
      // message row (id, attachments, edit/delete/read timestamps) that the
      // conversation detail page fetches instead.
      lastMessage: last
        ? {
            senderId: last.sender_id,
            text: last.text,
            createdAt: last.created_at,
          }
        : null,
      unreadCount: c._count.messages,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  private mapMessage(m: any) {
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.text,
      attachments: m.attachments,
      editedAt: m.edited_at,
      deletedAt: m.deleted_at,
      readAt: m.read_at,
      createdAt: m.created_at,
    };
  }

  private makePreview(text: string, attachmentCount: number): string {
    if (text) {
      const trimmed = text.replace(/\s+/g, ' ').trim();
      return trimmed.length > PREVIEW_LENGTH
        ? trimmed.slice(0, PREVIEW_LENGTH) + '…'
        : trimmed;
    }
    return attachmentCount > 1 ? `Shared ${attachmentCount} photos` : 'Shared a photo';
  }

  // Creates the chat attachments bucket on first use so uploads
  // never fail with "Bucket not found".
  private async ensureBucket() {
    if (this.bucketReady) return;

    const admin = this.supabase.getAdminClient();

    const { data: existing } = await admin.storage.getBucket(this.bucket);
    if (existing) {
      if (!existing.public) {
        await admin.storage.updateBucket(this.bucket, { public: true });
        this.logger.log(`Made storage bucket "${this.bucket}" public`);
      }
      this.bucketReady = true;
      return;
    }

    const { error: createError } = await admin.storage.createBucket(this.bucket, {
      public: true,
    });

    if (createError) {
      this.logger.error(
        `Failed to create storage bucket "${this.bucket}": ` + createError.message,
      );
      throw new BadRequestException(
        `Chat storage is not configured. Create a public bucket named "${this.bucket}" in Supabase → Storage.`,
      );
    }

    this.logger.log(`Created public storage bucket "${this.bucket}"`);
    this.bucketReady = true;
  }
}
