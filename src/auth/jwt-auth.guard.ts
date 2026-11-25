import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('translation.auth.invalid_token');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('translation.auth.invalid_token');
    }

    try {
      const isBlacklisted = await this.redisService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('translation.auth.token_blacklisted');
      }
      request['user'] = payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      throw new ServiceUnavailableException(
        'translation.auth.service_unavailable',
      );
    }

    return true;
  }
}
