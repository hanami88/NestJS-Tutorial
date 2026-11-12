import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Headers,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
@Controller('api/users')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  @Post()
  async register(@Body('user') createUserDto: any) {
    const user = await this.usersService.register(createUserDto);
    return { user: { email: user.email, username: user.username } };
  }

  @Post('login')
  async login(@Body('user') loginDto: any) {
    return this.authService.login(loginDto);
  }

  // API Đăng xuất (Logout)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader.split(' ')[1];

    // Giải mã để lấy thời gian hết hạn (exp) của Token
    const decoded = this.jwtService.decode(token);

    // Tính toán thời gian sống còn lại (bằng giây)
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    // Ném token vào Sổ đen Redis
    await this.redisService.addToBlacklist(token, expiresIn);

    return { message: 'auth.logout_success' };
  }

  // API Lấy thông tin bản thân (Current User)
  @Get()
  @UseGuards(JwtAuthGuard) // Chỉ người có Token chưa bị khóa mới lọt qua được
  async getCurrentUser(@Req() req: any) {
    // req.user được sinh ra từ JwtStrategy
    const email = req.user.email;
    const user = await this.usersService.findByEmail(email);
    return {
      user: {
        email: user?.email,
        token: req.headers.authorization.split(' ')[1],
        username: user?.username,
        bio: user?.bio,
        image: user?.image,
      },
    };
  }
}
