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
    const token = request.headers.authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('translation.auth.invalid_token');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('translation.auth.invalid_token');
    }

    // 3. Kiểm tra Redis Blacklist

    try {
      const isBlacklisted = await this.redisService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('translation.auth.token_blacklisted');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      // Lỗi sập Redis trả về 503 Service Unavailable 503

      throw new ServiceUnavailableException(
        'translation.auth.service_unavailable',
      );
    }
    return true;
  }
}
