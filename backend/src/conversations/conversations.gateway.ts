import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from './conversations.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ConversationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly conversationsService: ConversationsService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'rental_saas_jwt_secret_key_development_only_2026',
      );
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret,
      });

      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`WS connected: ${client.id} → user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnected: ${client.id}`);
  }

  // ── Emit helpers (called by the controller) ────────────────

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToConversation(
    tenantId: string,
    ownerId: string,
    event: string,
    payload: any,
  ) {
    this.server
      .to(`user:${tenantId}`)
      .to(`user:${ownerId}`)
      .emit(event, payload);
  }

  // ── Socket events from clients ─────────────────────────────

  @SubscribeMessage('typing')
  async onTyping(
    client: Socket,
    payload: { conversationId?: string; isTyping?: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      const peer = await this.conversationsService.getPeer(
        userId,
        payload.conversationId,
      );
      if (!peer) return;

      this.server.to(`user:${peer}`).emit('typing', {
        conversationId: payload.conversationId,
        userId,
        isTyping: !!payload.isTyping,
      });
    } catch {
      // ignore — invalid conversation silently ignored
    }
  }

  @SubscribeMessage('message:read')
  async onMessageRead(
    client: Socket,
    payload: { conversationId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      const peer = await this.conversationsService.getPeer(
        userId,
        payload.conversationId,
      );
      if (!peer) return;

      const { readAt } = await this.conversationsService.markRead(
        userId,
        payload.conversationId,
      );

      this.server.to(`user:${peer}`).emit('read', {
        conversationId: payload.conversationId,
        readAt,
      });
    } catch {
      // ignore
    }
  }
}
