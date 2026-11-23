import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      // Chạy toàn bộ logic kiểm tra token & Redis của JwtAuthGuard cha
      return await super.canActivate(context);
    } catch (error) {
      delete request['user'];
      // Nếu lỗi là do thiếu token, token sai hoặc token đã logout (401)
      // -> Bỏ qua lỗi và cho khách đi tiếp (request.user vẫn là undefined)
      if (error instanceof UnauthorizedException) {
        return true;
      }
      // Nếu là lỗi hệ thống khác (ví dụ 503 sập Redis) thì vẫn ném lỗi ra ngoài
      throw error;
    }
  }
}
