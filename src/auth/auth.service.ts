import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: any) {
    // 1. Tìm user qua email
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Sai email');
    }

    // 2. So sánh mật khẩu hash
    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Sai mật khẩu');
    }
    // 3. Tạo JWT Token (Payload là những thông tin không nhạy cảm)
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    const token = await this.jwtService.signAsync(payload);

    // 4. Trả về format chuẩn theo spec của Medium Clone
    return {
      user: {
        email: user.email,
        token: token,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}
