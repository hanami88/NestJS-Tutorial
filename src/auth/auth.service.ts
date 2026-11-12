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
    const email = loginDto.email.toLowerCase(); // Sửa lỗi chưa lowercase
    const user = await this.usersService.findByEmail(email);

    let isPasswordMatch = false;
    if (!user) {
      // Nếu không có user, VẪN CHO CHẠY BCRYPT với một mã hash giả
      // Để thời gian phản hồi của API luôn bằng nhau, chống Timing Attack
      await bcrypt.compare(
        loginDto.password,
        '$2b$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash',
      );
    } else {
      isPasswordMatch = await bcrypt.compare(loginDto.password, user.password);
    }

    if (!user || !isPasswordMatch) {
      // Sửa lỗi hardcode message: Thay vì viết cứng 'Sai email...', hãy dùng key của i18n
      throw new UnauthorizedException('translation.auth.invalid_credentials');
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
