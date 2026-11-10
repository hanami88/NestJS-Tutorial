import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
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

      try {
        const isBlacklisted = await this.redisService.isBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token đã bị vô hiệu hóa');
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;

        // RẤT QUAN TRỌNG: Nếu gọi Redis thất bại (sập), cấm cửa luôn, trả về 503
        throw new HttpException(
          'Dịch vụ xác thực tạm thời gián đoạn',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
    return true;
  }
}
