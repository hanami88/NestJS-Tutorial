import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      return true; // Không có token vẫn cho qua (khách vãng lai)
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return true;
    }

    try {
      const isBlacklisted = await this.redisService.isBlacklisted(token);
      if (isBlacklisted) {
        return true;
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      request['user'] = payload;
    } catch {
      // Token hết hạn hoặc sai định dạng -> coi như khách chưa đăng nhập
    }

    return true;
  }
}
