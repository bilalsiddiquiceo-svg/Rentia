import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Session } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    userAgent?: string,
  ): Promise<Session> {
    const refreshTokenHash = this.hashToken(refreshToken);
    return this.prisma.session.create({
      data: {
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
        user_agent: userAgent || 'Unknown',
      },
    });
  }

  async findSessionByHash(refreshToken: string): Promise<Session | null> {
    const refreshTokenHash = this.hashToken(refreshToken);
    return this.prisma.session.findFirst({
      where: { refresh_token_hash: refreshTokenHash },
    });
  }

  async revokeSession(sessionId: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revoked_at: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return result.count;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired session(s)`);
    }
  }
}
