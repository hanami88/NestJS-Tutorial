import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Chạy xác thực gốc của NestJS (kiểm tra chữ ký, thời hạn)
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    // 2. Trích xuất token từ Header
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Token ')) {
      const token = authHeader.split(' ')[1];

      // 3. Kiểm tra xem Token này đã bị Logout (chui vào Redis blacklist) chưa
      const isBlacklisted = await this.redisService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị vô hiệu hóa (Đăng xuất)');
      }
    }

    return true;
  }
}
