import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Bắt Header phải có định dạng: "Authorization: Token <chuỗi_jwt>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Token'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey_tam_thoi',
    });
  }

  async validate(payload: any) {
    // Dữ liệu này sẽ được NestJS tự động nhét vào biến req.user ở Controller
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
