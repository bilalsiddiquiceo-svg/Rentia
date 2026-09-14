import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // In-memory cache of validated users (60s TTL) so the JWT guard
  // doesn't hit Postgres on every single API request.
  private readonly userCache = new Map<
    string,
    { user: { id: string; email: string; role: string; phone: string | null }; expiresAt: number }
  >();
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'rental_saas_jwt_secret_key_development_only_2026'),
    });
  }

  async validate(payload: JwtPayload) {
    const cached = this.userCache.get(payload.sub);
    if (cached) {
      if (cached.expiresAt > Date.now()) return cached.user;
      this.userCache.delete(payload.sub);
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const result = {
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };

    this.userCache.set(payload.sub, {
      user: result,
      expiresAt: Date.now() + JwtStrategy.CACHE_TTL_MS,
    });

    return result;
  }
}
