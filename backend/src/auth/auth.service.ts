import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
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

    // Rotate refresh token
    await this.sessionsService.revokeSession(session.id);

    const user = await this.usersService.findById(session.user_id);
    if (!user) {
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = this.generateAccessToken(user.id, user.email, user.role);
    const newRefreshToken = this.generateRefreshToken();
    const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionsService.createSession(
      user.id,
      newRefreshToken,
      newRefreshExpiresAt,
      userAgent,
    );

    this.setRefreshTokenCookie(res, newRefreshToken, newRefreshExpiresAt);

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
}
