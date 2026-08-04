import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class OwnerUpgradeService {
  private readonly logger = new Logger(OwnerUpgradeService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async requestUpgrade(userId: string, name: string, phone: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.owner) {
      return { message: 'You are already an owner' };
    }

    // Persist the name + phone submitted in the owner form
    await this.usersService.updateProfile(userId, { name, phone });

    // Invalidate any previously pending (unconfirmed) requests for this user
    await this.prisma.ownerUpgradeRequest.deleteMany({
      where: { user_id: userId, confirmed_at: null },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.ownerUpgradeRequest.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const confirmationUrl = `${this.frontendUrl}/become-owner/confirm?token=${rawToken}`;

    const emailed = await this.mailService.sendOwnerUpgradeConfirmation(
      user.email,
      name,
      confirmationUrl,
    );

    // Always log the link for local development / testing
    this.logger.log(`\n==================================================`);
    this.logger.log(`[OWNER UPGRADE CONFIRMATION FOR ${user.email}]`);
    this.logger.log(`Confirmation Link: ${confirmationUrl}`);
    this.logger.log(`==================================================\n`);

    if (!emailed) {
      return {
        message:
          'Confirmation email generated. Email delivery is not configured — use the development link below to confirm.',
        confirmationUrlDev: confirmationUrl,
      };
    }

    return {
      message: `Confirmation email sent to ${user.email}. Check your inbox to activate your Owner account.`,
    };
  }

  async confirmUpgrade(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const request = await this.prisma.ownerUpgradeRequest.findFirst({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!request) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    if (request.confirmed_at) {
      return {
        message: 'This upgrade token has already been used.',
        user: {
          id: request.user.id,
          email: request.user.email,
          role: request.user.role,
        },
      };
    }

    if (new Date() > new Date(request.expires_at)) {
      throw new BadRequestException(
        'Confirmation token has expired. Please request a new owner upgrade confirmation.',
      );
    }

    // Mark request as confirmed
    await this.prisma.ownerUpgradeRequest.update({
      where: { id: request.id },
      data: { confirmed_at: new Date() },
    });

    // Clear any other pending requests so tokens can't pile up
    await this.prisma.ownerUpgradeRequest.deleteMany({
      where: { user_id: request.user_id, confirmed_at: null },
    });

    // Flip user role to owner
    const updatedUser = await this.usersService.updateRole(request.user_id, Role.owner);

    return {
      message: 'Congratulations! Your account has been upgraded to Owner status.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name,
        phone: updatedUser.phone,
      },
    };
  }
}
