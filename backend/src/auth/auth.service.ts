import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SignUpDto, LogInDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly isProd: boolean;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'rental_saas_jwt_secret_key_development_only_2026');
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
  }

  async signup(signUpDto: SignUpDto) {
    const existing = await this.usersService.findByEmail(signUpDto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(signUpDto.password, saltRounds);

    const user = await this.usersService.createUser({
      email: signUpDto.email,
      password_hash,
      phone: signUpDto.phone,
    });

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at,
      },
    };
  }

  async login(logInDto: LogInDto, userAgent: string, res: Response) {
    const user = await this.usersService.findByEmail(logInDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(logInDto.password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.sessionsService.createSession(
      user.id,
      refreshToken,
      refreshExpiresAt,
      userAgent,
    );

    this.setRefreshTokenCookie(res, refreshToken, refreshExpiresAt);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async refresh(refreshToken: string | undefined, userAgent: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const session = await this.sessionsService.findSessionByHash(refreshToken);

    if (!session) {
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('Invalid refresh session');
    }

    // Token Replay Attack Check: If token has already been revoked, revoke ALL sessions for user!
    if (session.revoked_at) {
      await this.sessionsService.revokeAllUserSessions(session.user_id);
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException(
        'Security Alert: Attempted reuse of an invalidated refresh token. All active sessions have been revoked.',
      );
    }

    if (new Date() > new Date(session.expires_at)) {
      await this.sessionsService.revokeSession(session.id);
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findById(session.user_id);
    if (!user) {
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = this.generateAccessToken(user.id, user.email, user.role);

    const sessionExpiresAt = new Date(session.expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (sessionExpiresAt <= fiveMinutesFromNow) {
      await this.sessionsService.revokeSession(session.id);

      const newRefreshToken = this.generateRefreshToken();
      const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.sessionsService.createSession(
        user.id,
        newRefreshToken,
        newRefreshExpiresAt,
        userAgent,
      );

      this.setRefreshTokenCookie(res, newRefreshToken, newRefreshExpiresAt);
    }

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      const session = await this.sessionsService.findSessionByHash(refreshToken);
      if (session) {
        await this.sessionsService.revokeSession(session.id);
      }
    }
    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully' };
  }

  private generateAccessToken(userId: string, email: string, role: Role): string {
    return this.jwtService.sign(
      { sub: userId, email, role },
      { secret: this.jwtSecret, expiresIn: '15m' },
    );
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      path: '/',
    });
  }
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    const successMessage = 'If an account exists with that email, a password reset link has been sent.';

    if (!user) {
      return { message: successMessage };
    }

    // Delete any prior unused reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { user_id: user.id, used_at: null },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordReset(user.email, resetUrl);

    const logger = new Logger('AuthService');
    if (this.isProd) {
      logger.log(`[PASSWORD RESET REQUESTED FOR ${user.email}]`);
    } else {
      logger.log(`\n==================================================`);
      logger.log(`[PASSWORD RESET FOR ${user.email}]`);
      logger.log(`Reset Link: ${resetUrl}`);
      logger.log(`==================================================\n`);
    }

    return { message: successMessage };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { token_hash: tokenHash },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.used_at) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(resetToken.user_id, passwordHash);

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used_at: new Date() },
    });

    // Invalidate all sessions for security
    await this.sessionsService.revokeAllUserSessions(resetToken.user_id);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

}
